import io
from pdfminer.high_level import extract_text_to_fp
from pdfminer.layout import LAParams

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using pdfminer.six"""
    output = io.StringIO()
    with io.BytesIO(pdf_bytes) as pdf_file:
        extract_text_to_fp(pdf_file, output, laparams=LAParams(), output_type='text', codec='utf-8')
    text = output.getvalue().strip()
    if not text:
        raise ValueError("Could not extract text from PDF. The file may be scanned/image-based.")
    return text
