import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

const navigation = createNavigation(routing);

export const { Link, getPathname, usePathname, useRouter } = navigation;

export const redirect: (
  args: Parameters<typeof navigation.redirect>[0],
  type?: Parameters<typeof navigation.redirect>[1],
) => never = navigation.redirect;
