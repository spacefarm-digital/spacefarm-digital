// The Paper Shader scenes behind the "Our apps" cards, and how each one changes on hover.
// PaperShader.astro mounts them by preset name; Apps.astro tweens the hover uniforms.
import {
  ShaderFitOptions,
  defaultObjectSizing,
  getShaderColorFromString,
  getShaderNoiseTexture,
  colorPanelsFragmentShader,
  ditheringFragmentShader,
  DitheringShapes,
  DitheringTypes,
  godRaysFragmentShader,
  metaballsFragmentShader,
  type ShaderMountUniforms,
} from '@paper-design/shaders';

export type Preset = {
  fragment: string;
  uniforms: ShaderMountUniforms;
  speed: number;
  pixelRatio?: number;
};

export type Hover = {
  /** Numeric uniforms at rest */
  off: Record<string, number>;
  /** The same uniforms while hovered or focused */
  on: Record<string, number>;
  speedOff: number;
  speedOn: number;
};

const sizing = (overrides: Partial<Record<string, number>> = {}): ShaderMountUniforms => ({
  u_fit: ShaderFitOptions[defaultObjectSizing.fit],
  u_scale: defaultObjectSizing.scale,
  u_rotation: defaultObjectSizing.rotation,
  u_offsetX: defaultObjectSizing.offsetX,
  u_offsetY: defaultObjectSizing.offsetY,
  u_originX: defaultObjectSizing.originX,
  u_originY: defaultObjectSizing.originY,
  u_worldWidth: defaultObjectSizing.worldWidth,
  u_worldHeight: defaultObjectSizing.worldHeight,
  ...overrides,
});
const colors = (list: string[]) => ({
  u_colors: list.map(getShaderColorFromString),
  u_colorsCount: list.length,
});
const stillness = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const appHover: Record<string, Hover> = {
  // A coarse Bayer dither that resolves into a smooth image: the HEIC opens.
  wtheic: {
    off: { u_pxSize: 6, u_scale: 0.62 },
    on: { u_pxSize: 1.5, u_scale: 0.72 },
    speedOff: 0.12,
    speedOn: 0.5,
  },
  // Three blobs idling, seven busy ones on hover.
  agents: {
    off: { u_count: 3, u_size: 0.55 },
    on: { u_count: 7, u_size: 0.75 },
    speedOff: 0.25,
    speedOn: 1,
  },
  // The sun comes out.
  sunlight: {
    off: { u_intensity: 0.6, u_midIntensity: 0.4, u_bloom: 0.4 },
    on: { u_intensity: 0.9, u_midIntensity: 0.8, u_bloom: 0.7 },
    speedOff: 0.2,
    speedOn: 0.8,
  },
  // The panels fan out and spin faster.
  chopchop: {
    off: { u_density: 2.2, u_angle1: 0.25, u_angle2: 0.1 },
    on: { u_density: 1.2, u_angle1: 0.6, u_angle2: 0.3 },
    speedOff: 0.3,
    speedOn: 1.6,
  },
};

export const appPresets: Record<string, () => Preset> = {
  wtheic: () => ({
    fragment: ditheringFragmentShader,
    speed: stillness() ? 0 : appHover.wtheic.speedOff,
    pixelRatio: 1,
    uniforms: {
      u_colorBack: getShaderColorFromString('#ffffff'),
      u_colorFront: getShaderColorFromString('#5538fa'),
      u_shape: DitheringShapes.sphere,
      u_type: DitheringTypes['8x8'],
      ...appHover.wtheic.off,
      ...sizing({ u_fit: ShaderFitOptions.cover, u_offsetX: 0.3, u_offsetY: 0.05 }),
    },
  }),
  agents: () => ({
    fragment: metaballsFragmentShader,
    speed: stillness() ? 0 : appHover.agents.speedOff,
    uniforms: {
      u_colorBack: getShaderColorFromString('#f7f8fa'),
      ...colors(['#5538fa', '#7080d4', '#5cffa0', '#d2defa']),
      ...appHover.agents.off,
      u_noiseTexture: getShaderNoiseTexture(),
      ...sizing({ u_fit: ShaderFitOptions.cover, u_scale: 0.8 }),
    },
  }),
  sunlight: () => ({
    fragment: godRaysFragmentShader,
    speed: stillness() ? 0 : appHover.sunlight.speedOff,
    uniforms: {
      u_colorBack: getShaderColorFromString('#ffffff'),
      u_colorBloom: getShaderColorFromString('#fed54f'),
      ...colors(['#fed54f', '#ff8c76', '#5cffa0', '#5538fa']),
      u_density: 0.35,
      u_spotty: 0.3,
      u_midSize: 0.4,
      ...appHover.sunlight.off,
      u_noiseTexture: getShaderNoiseTexture(),
      ...sizing({ u_fit: ShaderFitOptions.cover, u_scale: 1.4, u_offsetX: 0.75, u_offsetY: 0.75 }),
    },
  }),
  chopchop: () => ({
    fragment: colorPanelsFragmentShader,
    speed: stillness() ? 0 : appHover.chopchop.speedOff,
    uniforms: {
      u_colorBack: getShaderColorFromString('#ffffff'),
      ...colors(['#5cffa0', '#5538fa', '#ff4149', '#d2defa']),
      u_length: 1.1,
      u_edges: true,
      u_blur: 0,
      u_fadeIn: 0,
      u_fadeOut: 0.2,
      u_gradient: 0,
      ...appHover.chopchop.off,
      ...sizing({ u_fit: ShaderFitOptions.cover, u_scale: 1.2, u_rotation: 20, u_offsetX: 0.2 }),
    },
  }),
};
