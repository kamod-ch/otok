import type { FunctionalComponent } from "preact";
import { KamodMarkLogo } from "@kamod-ch/brand";
import { withBase } from "@kamod-ch/preactpress/client";

type FooterProps = {
  base: string;
};

const Footer: FunctionalComponent<FooterProps> = ({ base }) => (
  <footer class="kiw-footer">
    <a class="kiw-footer-logo" href="https://www.kamod.ch" target="_blank" rel="noopener noreferrer">
      <KamodMarkLogo base={base} resolveAsset={(path) => withBase(base, path)} />
    </a>

    <p class="kiw-footer-copy">
      Copyright © 2026 Klaus Zahiragic –{" "}
      <a href="https://www.kamod.ch" target="_blank" rel="noopener noreferrer">
        www.kamod.ch
      </a>
    </p>

    <p class="kiw-footer-built">
      Built with{" "}
      <a href="https://kamod-ch.github.io/preactpress/" target="_blank" rel="noopener noreferrer">
        PreactPress
      </a>
      .
    </p>
  </footer>
);

export default Footer;
