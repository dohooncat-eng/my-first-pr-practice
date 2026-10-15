"""Inline web/brain.js and web/network.json into web/page.html -> web/fly_snake.html."""
from pathlib import Path

web = Path(__file__).resolve().parents[1] / "web"
page = (web / "page.html").read_text()
page = page.replace("__NETWORK__", (web / "network.json").read_text().replace("</", "<\\/"))
page = page.replace("__BRAINJS__", (web / "brain.js").read_text())
(web / "fly_snake.html").write_text(page)
print("wrote", web / "fly_snake.html", round(len(page) / 1e6, 2), "MB")
