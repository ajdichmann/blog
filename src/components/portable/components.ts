import PortableFigure from "./PortableFigure.astro";
import PortableOrangeAlert from "./PortableOrangeAlert.astro";
import PortableCode from "./PortableCode.astro";
import PortableBreak from "./PortableBreak.astro";

/** Custom Portable Text types used in CMS content, for `<PortableText components>`. */
export const portableComponents = {
  type: {
    figure: PortableFigure,
    orangeAlert: PortableOrangeAlert,
    code: PortableCode,
    break: PortableBreak,
  },
};
