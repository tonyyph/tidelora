/** UI palette from the art direction brief. Scenes carry their own environmental colours. */
export const C = {
  deep: '#102E35',
  river: '#385B4F',
  mist: '#DCE4DC',
  ivory: '#F3EBDD',
  wood: '#79634F',
  brass: '#B99B63',
  warn: '#C9755E',
  ink: '#0B1A1D',
  inkSoft: 'rgba(11,26,29,0.72)',
  scrim: 'rgba(8,20,22,0.55)',
  line: 'rgba(243,235,221,0.16)',
  textDim: 'rgba(243,235,221,0.8)',
  paper: '#EFE6D4',
  paperInk: '#2B2A24',
  paperDim: '#6B6555',
  fresh: '#8DB596',
  /** Dark green card over painted scenes (asset pack v1 tokens). */
  panel: 'rgba(17,40,35,0.93)',
  panelSolid: '#142D27',
  panelLine: 'rgba(196,198,175,0.2)',
  secondary: '#C4C6AF',
  brassHi: '#DCC08A',
  brassLo: '#9E7F48',
};

export const F = {
  display: 'Lora_600SemiBold',
  displayItalic: 'Lora_500Medium_Italic',
  sans: 'BeVietnamPro_400Regular',
  sansMedium: 'BeVietnamPro_500Medium',
  sansBold: 'BeVietnamPro_600SemiBold',
};

/** Text scale: "large text" setting bumps every size by 15%. */
export const size = (base: number, large: boolean) => Math.round(base * (large ? 1.15 : 1));
