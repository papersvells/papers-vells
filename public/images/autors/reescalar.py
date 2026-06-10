from PIL import Image
from pathlib import Path

carpeta = Path("static/images/autors")
mida = (240, 240)

for img_path in carpeta.glob("*.webp"):
    img = Image.open(img_path)
    if img.width > 240 or img.height > 240:
        img.thumbnail(mida, Image.LANCZOS)
        img.save(img_path, "webp", quality=85)
        print(f"Redimensionat: {img_path.name}")
