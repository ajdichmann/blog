import { definePlugin } from "emdash";

/**
 * Registers the inline "orangeAlert" Portable Text block in the editor's
 * slash menu. Rendered by src/components/portable/PortableOrangeAlert.astro.
 */
export function createPlugin() {
  return definePlugin({
    id: "orange-alert",
    version: "1.0.0",
    admin: {
      portableTextBlocks: [
        {
          type: "orangeAlert",
          label: "Orange Alert",
          description: "Highlighted callout box with a heading and text",
          category: "Callouts",
          fields: [
            { type: "text_input", action_id: "title", label: "Heading", placeholder: "Pro Tip" },
            {
              type: "text_input",
              action_id: "message",
              label: "Text",
              multiline: true,
              placeholder: "Supports **bold**, *italic*, [links](https://example.com) and blank lines between paragraphs.",
            },
          ],
        },
      ],
    },
  });
}

export default createPlugin;
