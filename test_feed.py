import urllib.request
import xml.etree.ElementTree as ET

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

try:
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
    
    print(f"Successfully fetched {len(xml_data)} bytes.")
    
    # Parse the XML
    root = ET.fromstring(xml_data)
    
    # Print root tag and namespaces
    print("Root tag:", root.tag)
    
    # Atom feeds use namespace: http://www.w3.org/2005/Atom
    # Let's find entries
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('.//atom:entry', namespaces)
    print(f"Found {len(entries)} entries.")
    
    if entries:
        first = entries[0]
        title = first.find('atom:title', namespaces)
        updated = first.find('atom:updated', namespaces)
        summary = first.find('atom:summary', namespaces)
        content = first.find('atom:content', namespaces)
        link = first.find('atom:link', namespaces)
        
        print("\nFirst Entry Details:")
        print("Title:", title.text if title is not None else "N/A")
        print("Updated:", updated.text if updated is not None else "N/A")
        print("Summary:", summary.text if summary is not None else "N/A")
        print("Content (length):", len(content.text) if content is not None and content.text else "N/A")
        if content is not None and content.text:
            print("--- CONTENT ---")
            print(content.text[:1000])
            print("---------------")
        if link is not None:
            print("Link:", link.attrib.get('href'))
            
except Exception as e:
    print("Error:", e)
