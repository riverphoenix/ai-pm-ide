"""
Document parsing utilities for PDFs, URLs, and Google Docs
"""

import requests
from typing import Optional, Dict
import logging
import re
import urllib3

# Disable SSL warnings when verification is disabled
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

# Try to import PDF parser (PyMuPDF)
try:
    import fitz  # PyMuPDF
    HAS_PDF_SUPPORT = True
except ImportError:
    HAS_PDF_SUPPORT = False
    logger.warning("PyMuPDF not installed. PDF parsing will be disabled.")

# Try to import BeautifulSoup for HTML parsing
try:
    from bs4 import BeautifulSoup
    HAS_HTML_SUPPORT = True
except ImportError:
    HAS_HTML_SUPPORT = False
    logger.warning("BeautifulSoup not installed. URL content extraction will be limited.")


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """
    Extract text from PDF bytes

    Returns extracted text or empty string if parsing fails
    """
    if not HAS_PDF_SUPPORT:
        raise Exception("PDF parsing not available. Install PyMuPDF: pip install PyMuPDF")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_parts = []
        page_count = len(doc)

        for page_num in range(page_count):
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                text_parts.append(f"--- Page {page_num + 1} ---\n{text}")

        doc.close()

        full_text = "\n\n".join(text_parts)
        logger.info(f"Extracted {len(full_text)} characters from {page_count} page PDF")
        return full_text

    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise Exception(f"Failed to extract PDF text: {str(e)}")


def fetch_url_content(url: str, timeout: int = 10) -> Dict[str, str]:
    """
    Fetch and extract text content from a URL

    Returns dict with 'content' and 'title' keys
    """
    try:
        # Set user agent to avoid being blocked
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }

        response = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True, verify=False)
        response.raise_for_status()

        content_type = response.headers.get('content-type', '').lower()

        # Handle PDF URLs
        if 'application/pdf' in content_type:
            if not HAS_PDF_SUPPORT:
                raise Exception("PDF parsing not available")
            text = extract_pdf_text(response.content)
            return {
                'content': text,
                'title': extract_title_from_url(url),
                'type': 'pdf'
            }

        # Handle HTML content
        if 'text/html' in content_type or 'text/plain' in content_type:
            if HAS_HTML_SUPPORT and 'text/html' in content_type:
                soup = BeautifulSoup(response.content, 'html.parser')

                # Extract title
                title_tag = soup.find('title')
                title = title_tag.get_text().strip() if title_tag else extract_title_from_url(url)

                # Remove script and style elements
                for script in soup(["script", "style", "nav", "footer", "header"]):
                    script.decompose()

                # Get text
                text = soup.get_text(separator='\n', strip=True)

                # Clean up excessive newlines
                text = re.sub(r'\n\s*\n', '\n\n', text)

            else:
                # Fallback to raw text
                text = response.text
                title = extract_title_from_url(url)

            logger.info(f"Fetched {len(text)} characters from {url}")
            return {
                'content': text,
                'title': title,
                'type': 'html'
            }

        # Unsupported content type
        raise Exception(f"Unsupported content type: {content_type}")

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch URL {url}: {e}")
        raise Exception(f"Failed to fetch URL: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing URL content: {e}")
        raise Exception(f"Error processing content: {str(e)}")


def extract_title_from_url(url: str) -> str:
    """Extract a readable title from a URL"""
    # Remove protocol and query params
    title = re.sub(r'^https?://(www\.)?', '', url)
    title = title.split('?')[0]
    # Replace separators with spaces
    title = re.sub(r'[/_-]', ' ', title)
    # Capitalize words
    title = ' '.join(word.capitalize() for word in title.split())
    return title[:100]  # Limit length


def parse_google_docs_url(url: str) -> Optional[str]:
    """
    Extract document ID from Google Docs URL

    Supports formats:
    - https://docs.google.com/document/d/{doc_id}/edit
    - https://docs.google.com/document/d/{doc_id}/view
    """
    patterns = [
        r'docs\.google\.com/document/d/([a-zA-Z0-9_-]+)',
        r'drive\.google\.com/file/d/([a-zA-Z0-9_-]+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    return None


def fetch_google_docs_content(url: str) -> Dict[str, str]:
    """
    Fetch content from a public Google Docs URL

    Note: This only works for publicly accessible documents.
    For private docs, users should copy/paste the content.
    """
    doc_id = parse_google_docs_url(url)
    if not doc_id:
        raise Exception("Invalid Google Docs URL format")

    # Try to fetch as plain text export
    export_url = f"https://docs.google.com/document/d/{doc_id}/export?format=txt"

    try:
        response = requests.get(export_url, timeout=10, allow_redirects=True, verify=False)

        # Check if we got redirected to login (document is private)
        if 'accounts.google.com' in response.url:
            raise Exception(
                "This Google Doc is private. To use it:\n"
                "1. Make the doc public (Share → Anyone with link)\n"
                "2. Or copy/paste the content as text instead"
            )

        response.raise_for_status()

        content = response.text
        logger.info(f"Fetched {len(content)} characters from Google Docs")

        return {
            'content': content,
            'title': f"Google Doc ({doc_id[:8]}...)",
            'type': 'google_doc'
        }

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch Google Docs: {e}")
        raise Exception(
            "Unable to fetch Google Doc. The document may be:\n"
            "• Private (make it public or copy/paste content)\n"
            "• Invalid link\n"
            "• Deleted or moved"
        )


def parse_document(doc_type: str, source: str, content: Optional[str] = None) -> Dict[str, str]:
    """
    Unified document parsing function

    Args:
        doc_type: 'url', 'pdf', 'google_doc', or 'text'
        source: URL or file path
        content: Optional pre-provided content (for 'text' type or PDF bytes)

    Returns:
        Dict with 'content', 'title', and 'type' keys
    """
    if doc_type == 'text':
        return {
            'content': content or '',
            'title': 'Text Document',
            'type': 'text'
        }

    elif doc_type == 'url':
        return fetch_url_content(source)

    elif doc_type == 'google_doc':
        return fetch_google_docs_content(source)

    elif doc_type == 'pdf':
        if isinstance(content, bytes):
            text = extract_pdf_text(content)
            return {
                'content': text,
                'title': 'PDF Document',
                'type': 'pdf'
            }
        else:
            raise Exception("PDF content must be provided as bytes")

    else:
        raise Exception(f"Unsupported document type: {doc_type}")
