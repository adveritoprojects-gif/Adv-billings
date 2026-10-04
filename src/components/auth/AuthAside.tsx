import GridShape from "@/components/common/GridShape";
import { Link } from "@/i18n/navigation";
import { loginDisplayLogo, type TenantBranding } from "@/utils/branding";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

interface AuthAsideProps {
  branding: TenantBranding;
}

export default async function AuthAside({ branding }: AuthAsideProps) {
  const t = await getTranslations("auth");
  const logo = loginDisplayLogo(branding);
  const backgroundStyle = branding.loginBackground
    ? {
        backgroundImage: `url(${branding.loginBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div
      className="relative lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden"
      style={backgroundStyle}
    >
      {branding.loginBackground ? <div className="absolute inset-0 bg-black/50" /> : null}
      <div className="relative items-center justify-center flex z-1">
        <GridShape />
        <div className="flex flex-col items-center max-w-xs">
          <Link href="/" className="block mb-4">
            <Image
              width={231}
              height={48}
              src={logo}
              alt={`${branding.name} logo`}
              className="h-12 w-auto max-w-full object-contain"
            />
          </Link>
          <p className="mb-1 text-center text-lg font-semibold text-white">
            {branding.name}
          </p>
          <p className="text-center text-gray-400 dark:text-white/60">
            {t("aside.tagline")}
          </p>
        </div>
      </div>
    </div>
  );
}
