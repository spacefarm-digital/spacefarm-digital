// Builds the footer farm at build time from the 2017 illustration (2560×332, five stepped tiers of
// tanks drawn in one-point perspective). The art is extended sideways so it spans any viewport:
// each tier's tank fronts are tiled at that tier's five-unit period, the white tier tops and their
// separator lines are redrawn across the full width (the lines converge on the art's vanishing
// point), and the plants are planted along every tier with a gap on every separator. Vents and red
// lights are rendered through <use> so the CSS animations target one element per vent/light row,
// not a template plus its clones.

/** Extra width drawn on each side of the original 2560px art. Covers viewports up to 7680px. */
export const SIDE = 2560;
export const WIDTH = 2560 + 2 * SIDE;
export const HEIGHT = 332;

/** The art's centre line and where its tier edges and separator lines meet, measured from the 2017 art. */
const CENTRE = 1280;
const VANISHING_POINT = { x: CENTRE, y: -115 };

/** Plants per tank unit; every sixth plant sits on a separator line and is left out, as in 2017. */
const PLANTS_PER_UNIT = 6;

type Tier = {
  /** Top surface: y of the back edge and of the front edge. */
  top: [number, number];
  /** Front face: y range of the tier's front rect in the art (null: the front tier shows none). */
  front: [number, number] | null;
  /** Width of one tank unit along the front edge; units are centred on the art's centre line. */
  pitch: number;
  /** y band holding this tier's tank fronts, vents and lights (null: the front tier shows none). */
  band: [number, number] | null;
  /** Separator line thickness, measured from the art. */
  stroke: number;
  /** Plant row template. */
  plant: string;
};

// Front tier first. Pitches are measured from the separator lines on each tier's front edge.
const TIERS: Tier[] = [
  { top: [262, 332], front: null, pitch: 516, band: null, stroke: 4, plant: 'row-1-plant' },
  {
    top: [177, 232],
    front: [228, 311],
    pitch: 401,
    band: [177, 262],
    stroke: 3.5,
    plant: 'row-2-plant',
  },
  {
    top: [107, 152],
    front: [148, 211],
    pitch: 308,
    band: [107, 177],
    stroke: 2.9,
    plant: 'row-3-plant',
  },
  {
    top: [52, 87],
    front: [84, 130],
    pitch: 233.5,
    band: [52, 107],
    stroke: 2.4,
    plant: 'row-4-plant',
  },
  { top: [12, 37], front: [35, 68], pitch: 176, band: [0, 52], stroke: 2.1, plant: 'row-5-plant' },
];

/** Static layers that make up a tier's front, in draw order. */
const FRONT_LAYERS = [
  'right-water-bg',
  'right-water',
  'water-bg',
  'water',
  'fronts',
  'tank-frames',
  'displays',
  'yellow-lights',
  'green-lights',
];

const FRONT_FILL = '#f1f2f9';

const fmt = (n: number) => String(Math.round(n * 100) / 100);

export function buildFarm(source: string): string {
  // Keep the <svg> element and its attributes, drop the XML prolog and the unused placeholder rect.
  const open = source.indexOf('<svg');
  let svg = source.slice(open);
  svg = svg.replace(/<rect id="more-fans"[^>]*\/>/, '');
  svg = svg.replace(
    'viewBox="0 0 2560 332"',
    `viewBox="${-SIDE} 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMax slice"`,
  );

  // The vents and red lights become templates: each is referenced by one animated <use> per copy.
  const fansMatch = svg.match(/<g id="fans">([\s\S]*?)<\/g>(?=<path id="red-lights")/);
  const redMatch = svg.match(/<path id="red-lights"[^>]*\/>/);
  if (!fansMatch || !redMatch) {
    throw new Error('farm.ts: the illustration no longer has the fans group or the red lights');
  }
  let fanCount = 0;
  const fans: { id: string; y: number }[] = [];
  const fanTemplates = fansMatch[1].replace(
    /<g (?:id="fan"|class="fan")>([\s\S]*?)<\/g>/g,
    (_, inner: string) => {
      const id = `vent-${++fanCount}`;
      const m = inner.match(/d="M[^,]+,([^cl ]+)/);
      fans.push({ id, y: m ? parseFloat(m[1]) : 0 });
      return `<g id="${id}">${inner}</g>`;
    },
  );
  svg = svg.replace(fansMatch[0], '');
  svg = svg.replace(redMatch[0], '');
  // The old tops (with their slanted ends) and separator lines are redrawn full width below.
  svg = svg.replace(/<path id="tops"[^>]*\/>/, '').replace(/<path id="lines"[^>]*\/>/, '');
  // The plant templates (the five row-N-plant groups, just before <defs>) only render through <use>.
  const plantStart = svg.indexOf('<g id="row-1-plant">');
  const defsStart = svg.indexOf('<defs>');
  if (plantStart < 0 || defsStart < plantStart) {
    throw new Error('farm.ts: the illustration no longer has the five plant rows');
  }
  const plantTemplates = svg.slice(plantStart, defsStart);
  svg = svg.slice(0, plantStart) + svg.slice(defsStart);

  const defs: string[] = [];
  const backs: string[] = [];
  const copies: string[] = [];
  const tops: string[] = [];
  const lines: string[] = [];
  const vents: string[] = [];
  const lights: string[] = [];
  const planted: string[] = [];

  const xMin = -SIDE;
  const xMax = 2560 + SIDE;

  TIERS.forEach((tier, index) => {
    const [yBack, yFront] = tier.top;
    const period = tier.pitch * 5;

    if (tier.band && tier.front) {
      // The art's front rect is a little narrower than five units (the tier's rounded ends cut
      // in), so a full-width backing in the front colour fills the sliver between copies.
      backs.push(
        `<rect x="${xMin}" y="${tier.front[0]}" width="${WIDTH}" height="${tier.front[1] - tier.front[0]}" style="fill:${FRONT_FILL};"/>`,
      );

      // Tank fronts, tiled sideways at this tier's five-unit period and clipped to the tier's band.
      const clipId = `band-${index + 1}`;
      defs.push(
        `<clipPath id="${clipId}"><rect x="${xMin}" y="${tier.band[0]}" width="${WIDTH}" height="${tier.band[1] - tier.band[0]}"/></clipPath>`,
      );
      const perSide = Math.ceil(SIDE / period);
      const offsets: number[] = [];
      for (let i = 1; i <= perSide; i++) offsets.push(i * period, -i * period);
      for (const dx of offsets) {
        copies.push(
          `<g clip-path="url(#${clipId})">` +
            FRONT_LAYERS.map((id) => `<use href="#${id}" x="${fmt(dx)}"/>`).join('') +
            '</g>',
        );
      }

      // Vents and red lights at every copy, including the original position.
      const allOffsets = [0, ...offsets];
      for (const fan of fans) {
        if (fan.y < tier.band[0] || fan.y >= tier.band[1]) continue;
        // The offset goes on a wrapping group: Chrome measures a <use>'s fill-box before its x shift,
        // so a shifted <use> would spin around the template's centre instead of its own.
        for (const dx of allOffsets) {
          vents.push(
            `<g transform="translate(${fmt(dx)},0)"><use class="vent" href="#${fan.id}"/></g>`,
          );
        }
      }
      for (const dx of allOffsets) {
        lights.push(
          `<use class="red-light" href="#red-lights" x="${fmt(dx)}" clip-path="url(#${clipId})"/>`,
        );
      }
    }

    // Tier top, full width, and its separator lines (one per unit boundary) converging on the
    // vanishing point.
    tops.push(
      `<rect x="${xMin}" y="${yBack}" width="${WIDTH}" height="${yFront - yBack}" style="fill:#fff;"/>`,
    );
    const t = (yBack - yFront) / (VANISHING_POINT.y - yFront);
    const d: string[] = [];
    const first = Math.ceil((xMin - CENTRE) / tier.pitch - 0.5);
    const last = Math.floor((xMax - CENTRE) / tier.pitch - 0.5);
    for (let k = first; k <= last; k++) {
      const xf = CENTRE + (k + 0.5) * tier.pitch;
      const xb = xf + (VANISHING_POINT.x - xf) * t;
      d.push(`M${fmt(xf)},${yFront}L${fmt(xb)},${yBack}`);
    }
    lines.push(
      `<path d="${d.join('')}" style="fill:none;stroke:#f0eff3;stroke-width:${tier.stroke};"/>`,
    );

    // Plants, evenly spaced from the centre outward (one-point perspective keeps a row's spacing
    // even), six per unit with the one on each separator line left out.
    const step = tier.pitch / PLANTS_PER_UNIT;
    const count = Math.ceil((SIDE + CENTRE) / step);
    for (let i = -count; i <= count; i++) {
      if (Math.abs(i) % PLANTS_PER_UNIT === PLANTS_PER_UNIT / 2) continue;
      planted.push(`<use href="#${tier.plant}" x="${fmt(i * step)}"/>`);
    }
  });

  const generated =
    `<defs>${fanTemplates}${redMatch[0]}${plantTemplates}${defs.join('')}</defs>` +
    `<g id="farm-fronts">${copies.join('')}</g>` +
    `<g id="farm-vents">${vents.join('')}</g>` +
    `<g id="farm-lights">${lights.join('')}</g>` +
    `<g id="farm-tops">${tops.join('')}</g>` +
    `<g id="farm-lines">${lines.join('')}</g>` +
    `<g id="farm-plants">${planted.join('')}</g>`;

  // The backings go first, under the art; everything generated goes last, over it.
  const openEnd = svg.indexOf('>') + 1;
  const close = svg.lastIndexOf('</svg>');
  return (
    svg.slice(0, openEnd) +
    `<g id="farm-backs">${backs.join('')}</g>` +
    svg.slice(openEnd, close) +
    generated +
    svg.slice(close)
  );
}
