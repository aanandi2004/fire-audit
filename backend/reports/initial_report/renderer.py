from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMPLATES_DIR = BASE_DIR / "templates" / "initial_report"
STATIC_DIR = BASE_DIR / "static"

env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"])
)

def render_html(ctx: dict) -> str:
    page1 = env.get_template("report1.html").render(**ctx)
    page2 = env.get_template("report2.html").render(**ctx)
    page3 = env.get_template("report3.html").render(**ctx)
    return page1 + page2 + page3

def render_pdf(ctx: dict) -> bytes:
    from weasyprint import HTML, CSS
    html = render_html(ctx)
    css = CSS(filename=str(STATIC_DIR / "report.css"))
    return HTML(string=html, base_url=str(BASE_DIR)).write_pdf(stylesheets=[css])
