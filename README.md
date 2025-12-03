# PixelGarden

PixelGarden is a lightweight generative-art and pixel-sprite sandbox built with **React**,  
**TypeScript**, and **Vite**.  

It allows you to paint seeds on a small grid and apply different growth rules to turn those  
seeds into organic shapes, portraits, creatures, biomes, and abstract effects.  

Originally created as a playful tool to assist with **2D pixel-art asset generation**,  
ideation, and experimentation.

---

##  Features

###  **Drawing Tools**
- Brush and eraser
- Predefined palette + full **colour picker**

### **Generative Rules**
PixelGarden includes multiple “families” of growth systems:

#### **World & Biomes**
- `moss` – organic spreading plantlike growth  
- `crystal` – sharp, branch-like structures  
- `coral` – branching coral/organism patterns  
- `lava` – explosive fire-like spreading  
- `terrain` – map-like elevation shading  
- `slime` – rounding, merging blob behaviour 
- `snowfall` – slow, icy fractal drifts  
- `chaos` – random pixel chaos.
- `magicDrawAura` – coloured halo ring around centre sprites, kind of looks like a donut usualy with sprinkles!

#### **MagicDraw Family**
- `magicDraw` – symmetric character-like sprites  
- `magicDraw2` – expressive strokes, soft symmetry  

#### **Avatars & Portraits**
- `avatar` – structured humanoid skeleton that evolves  
- `avatar2` – organic avatar builder using fuzzy strokes  
- `magicPortrait` – abstract face/torso generation  
- `magicPortrait2` – softer portrait blobs with subtle symmetric growth  

###  **Controls**
- Play / Pause simulation
- Step once
- Clear grid
- Add random seeds
- Adjustable simulation speed

###  **Grid**
- 32×32 pixel grid
- Dark background with faint grid lines
- Canvas rendering

---

## Tech Stack

- **React 18**
- **TypeScript**
- **Vite**
- **Vitest** (unit tests)
- Contributers are encouraged to maintain these principles:
  - Modular architecture
  - SRP
  - KISS
  - DRY
  - SOLID-friendly separation
  - Clean separation of UI vs pure simulation logic


- **core/** contains pure functional logic (testable with Vitest)
- **components/** contains UI and interaction
- **rules/** contains each growth mode, grouped cleanly

---

##  Getting started

```bash
# Clone the repository
git clone https://github.com/your-username/pixel-garden.git
cd pixel-garden

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test   # or like me: npx vitest 
```
Open http://localhost:5173 # or whatever the terminal link shows
 and start drawing!

## Testing
PixelGarden includes a small but growing test suite using Vitest:

grid shape validation

colour averaging & clamping

rule behaviour smoke tests (ensures a valid output and no crashes)

to run the tests:
```bash
# Run tests
npm test   # or like me: npx vites
```

## Open source & Contributions

PixelGarden is open to contributions – new rules, tools, UI improvements, bug fixes,
or general refactoring are all welcome.

If you'd like to request a feature, improve a rule, or collaborate:
feel free to open an issue or reach out.

I hope this tool brings inspiration, joy, and a bit of creative chaos to your art experiments.
If any assets are used for ur games or other creative endeavors please let me know, I would love to see them!


Credits / Attribution

This project is released under the MIT License.

Attribution is not required, but always appreciated.
If PixelGarden helps you in your work, giving a small credit or star on GitHub
really helps the project grow and encourages further development.

## Contact
 Again - If you'd like to collaborate, propose new growth rules, features
or integrate PixelGarden into your own projects; just reach out il be happy to help.