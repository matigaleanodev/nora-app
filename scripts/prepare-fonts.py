"""Genera pesos estáticos de la fuente aprobada para Android y el motor PDF."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
root = Path(__file__).resolve().parents[1]
source = root / "docs/design-kit/assets/NotoSans.ttf"
for weight, name in [(400, "NotoSans"), (500, "NotoSans-Medium"), (600, "NotoSans-SemiBold"), (700, "NotoSans-Bold")]:
    font = TTFont(source)
    axes = {axis.axisTag: axis.defaultValue for axis in font["fvar"].axes}
    axes["wght"] = weight
    instance = instantiateVariableFont(font, axes, inplace=True)
    instance.save(root / "assets" / (name + ".ttf"))
    print(name)
