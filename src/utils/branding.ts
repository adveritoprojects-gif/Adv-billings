const DEFAULT_PRIMARY = "#465fff";

const WHITE_MIX: Record<number, number> = {
  25: 0.97,
  50: 0.94,
  100: 0.86,
  200: 0.7,
  300: 0.5,
  400: 0.25,
};

const BLACK_MIX: Record<number, number> = {
  600: 0.12,
  700: 0.26,
  800: 0.44,
  900: 0.6,
  950: 0.74,
};

const SCALE_STEPS = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

function parseHex(hex: string): [number, number, number] | null {
  const value = hex.trim().replace(/^#/, "");
  if (value.length === 3) {
    const r = value[0];
    const g = value[1];
    const b = value[2];
    return [
      parseInt(r + r, 16),
      parseInt(g + g, 16),
      parseInt(b + b, 16),
    ];
  }
  if (value.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(value)) {
    return null;
  }
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const channel = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function mixWith(
  rgb: [number, number, number],
  target: [number, number, number],
  ratio: number,
): string {
  const r = rgb[0] + (target[0] - rgb[0]) * ratio;
  const g = rgb[1] + (target[1] - rgb[1]) * ratio;
  const b = rgb[2] + (target[2] - rgb[2]) * ratio;
  return toHex(r, g, b);
}

export function darken(hex: string, ratio: number): string {
  const rgb = parseHex(hex) ?? parseHex(DEFAULT_PRIMARY)!;
  return mixWith(rgb, [0, 0, 0], ratio);
}

function buildScale(hex: string): Record<string, string> {
  const rgb = parseHex(hex) ?? parseHex(DEFAULT_PRIMARY)!;
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];
  const vars: Record<string, string> = {};
  for (const step of SCALE_STEPS) {
    if (step === 500) {
      vars[`--color-brand-${step}`] = toHex(rgb[0], rgb[1], rgb[2]);
    } else if (WHITE_MIX[step] !== undefined) {
      vars[`--color-brand-${step}`] = mixWith(rgb, white, WHITE_MIX[step]);
    } else if (BLACK_MIX[step] !== undefined) {
      vars[`--color-brand-${step}`] = mixWith(rgb, black, BLACK_MIX[step]);
    }
  }
  return vars;
}

export function buildBrandVars(
  primaryColor: string | null,
  secondaryColor: string | null,
): Record<string, string> {
  const primary =
    (primaryColor && parseHex(primaryColor) ? primaryColor : null) ??
    DEFAULT_PRIMARY;
  const secondary =
    (secondaryColor && parseHex(secondaryColor) ? secondaryColor : null) ??
    darken(primary, 0.25);

  const scale = buildScale(primary);

  return {
    ...scale,
    "--brand-primary": primary,
    "--brand-secondary": secondary,
    "--brand-background": scale["--color-brand-25"] ?? primary,
  };
}

export const PRODUCT_NAME = "Adv Billings";

export const PRODUCT_COMPANY = "Adverito";

export const PRODUCT_TAGLINE = "Business management software by Adverito";

export const DEFAULT_AUTH_LOGO = "/images/logo/auth-logo.svg";
export const DEFAULT_FAVICON = "/favicon.ico";

export interface TenantBranding {
  name: string;
  logo: string | null;
  favicon: string | null;
  loginLogo: string | null;
  loginBackground: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export const DEFAULT_BRANDING: TenantBranding = {
  name: PRODUCT_NAME,
  logo: DEFAULT_AUTH_LOGO,
  favicon: DEFAULT_FAVICON,
  loginLogo: null,
  loginBackground: null,
  primaryColor: DEFAULT_PRIMARY,
  secondaryColor: darken(DEFAULT_PRIMARY, 0.25),
};

export interface BrandingSource {
  name?: string | null;
  logo?: string | null;
  favicon?: string | null;
  loginLogo?: string | null;
  loginBackground?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export function resolveTenantBranding(
  source: BrandingSource | null | undefined,
): TenantBranding {
  if (!source) {
    return DEFAULT_BRANDING;
  }
  const primary =
    (source.primaryColor && parseHex(source.primaryColor)
      ? source.primaryColor
      : null) ?? DEFAULT_BRANDING.primaryColor;
  const secondary =
    (source.secondaryColor && parseHex(source.secondaryColor)
      ? source.secondaryColor
      : null) ?? darken(primary, 0.25);

  return {
    name: source.name?.trim() || DEFAULT_BRANDING.name,
    logo: source.logo?.trim() || DEFAULT_BRANDING.logo,
    favicon: source.favicon?.trim() || DEFAULT_BRANDING.favicon,
    loginLogo: source.loginLogo?.trim() || null,
    loginBackground: source.loginBackground?.trim() || null,
    primaryColor: primary,
    secondaryColor: secondary,
  };
}

export function loginDisplayLogo(branding: TenantBranding): string {
  return (
    branding.loginLogo ?? branding.logo ?? DEFAULT_BRANDING.logo ?? DEFAULT_AUTH_LOGO
  );
}

export function brandingStyle(
  branding: TenantBranding,
): Record<string, string> {
  return buildBrandVars(branding.primaryColor, branding.secondaryColor);
}
