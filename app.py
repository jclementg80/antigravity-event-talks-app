import re
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache for release notes
# Structure: { "data": [...], "timestamp": 0.0 }
CACHE_DURATION = 600  # 10 minutes
feed_cache = {
    "data": None,
    "timestamp": 0.0
}

def parse_release_notes():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    response = requests.get(url, headers=headers, timeout=15)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch feed: HTTP {response.status_code}")
        
    xml_data = response.content
    root = ET.fromstring(xml_data)
    
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('.//atom:entry', namespaces)
    
    updates = []
    update_id_counter = 0
    
    for entry in entries:
        title_el = entry.find('atom:title', namespaces)
        date_str = title_el.text.strip() if title_el is not None else "Unknown Date"
        
        updated_el = entry.find('atom:updated', namespaces)
        updated_str = updated_el.text.strip() if updated_el is not None else ""
        
        link_el = entry.find('atom:link', namespaces)
        link_str = link_el.attrib.get('href', '').strip() if link_el is not None else ""
        
        content_el = entry.find('atom:content', namespaces)
        if content_el is None or not content_el.text:
            continue
            
        soup = BeautifulSoup(content_el.text, 'html.parser')
        
        # We group elements following an h3 under that h3's type.
        # If there's content before any h3, it falls under "General".
        current_type = "General"
        current_html_parts = []
        
        def save_current_update(u_type, u_parts):
            nonlocal update_id_counter
            if not u_parts:
                return None
                
            # Build HTML content
            html_content = "".join(str(p) for p in u_parts).strip()
            if not html_content:
                return None
                
            # Parse text and clean it up
            temp_soup = BeautifulSoup(html_content, 'html.parser')
            
            # Make sure links inside HTML are absolute
            for a_tag in temp_soup.find_all('a'):
                if a_tag.get('href') and a_tag['href'].startswith('/'):
                    a_tag['href'] = "https://docs.cloud.google.com" + a_tag['href']
                    
            html_content_fixed = str(temp_soup)
            
            plain_text = temp_soup.get_text(separator=' ').strip()
            plain_text = re.sub(r'\s+', ' ', plain_text)
            
            # Extract anchor link specific to this update block
            # Google's feed uses link anchors like #June_17_2026. We can use the date string for anchors.
            anchor = date_str.replace(" ", "_").replace(",", "")
            specific_link = f"{link_str}#{anchor}" if link_str else ""
            
            return {
                'id': f"up-{update_id_counter}",
                'date': date_str,
                'timestamp': updated_str,
                'link': specific_link,
                'type': u_type.strip(),
                'html': html_content_fixed,
                'text': plain_text
            }

        for child in soup.contents:
            if child.name in ['h3', 'h4', 'h2']:
                # Save previous section
                res = save_current_update(current_type, current_html_parts)
                if res:
                    updates.append(res)
                    update_id_counter += 1
                
                # Start new section
                current_type = child.get_text().strip()
                current_html_parts = []
            else:
                if str(child).strip():
                    current_html_parts.append(child)
                    
        # Save last section
        res = save_current_update(current_type, current_html_parts)
        if res:
            updates.append(res)
            update_id_counter += 1
            
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases', methods=['GET'])
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    # Check cache
    if not force_refresh and feed_cache["data"] is not None and (now - feed_cache["timestamp"] < CACHE_DURATION):
        return jsonify({
            "status": "success",
            "source": "cache",
            "data": feed_cache["data"],
            "cached_at": feed_cache["timestamp"]
        })
        
    try:
        releases = parse_release_notes()
        feed_cache["data"] = releases
        feed_cache["timestamp"] = now
        return jsonify({
            "status": "success",
            "source": "network",
            "data": releases,
            "cached_at": now
        })
    except Exception as e:
        # If cache exists, fall back to cache on failure
        if feed_cache["data"] is not None:
            return jsonify({
                "status": "warning",
                "message": f"Failed to refresh. Serving cached data: {str(e)}",
                "source": "cache_fallback",
                "data": feed_cache["data"],
                "cached_at": feed_cache["timestamp"]
            })
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
