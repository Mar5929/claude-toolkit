# Screenshot Workflow

## Taking Screenshots

Always screenshot from localhost:

```bash
node screenshot.mjs http://localhost:3000
node screenshot.mjs http://localhost:3000 hero-section
```

Screenshots save to `./temporary screenshots/screenshot-N.png` with auto-incrementing N (never overwrites).

If a label is provided: `screenshot-N-label.png`

## Reviewing Screenshots

After screenshotting, read the PNG from `temporary screenshots/` with the Read tool — you can see and analyze the image directly.

## Comparing Against a Reference Design

When comparing against a reference design, be specific:

- "heading is 32px but reference shows ~24px"
- "card gap is 16px but should be 24px"
- "border-radius is 4px but design uses 8px"

## Verification Checklist

- [ ] Spacing / padding
- [ ] Font size / weight / line-height
- [ ] Colors (exact hex values)
- [ ] Alignment
- [ ] Border-radius
- [ ] Shadows
- [ ] Image sizing
