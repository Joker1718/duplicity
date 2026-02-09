import fs from "fs/promises";
import path from "path";
import { Children, isValidElement } from "react";
import ReactMarkdown from "react-markdown";

function flattenText(node) {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(flattenText).join("");
  }
  if (isValidElement(node)) {
    return flattenText(node.props?.children);
  }
  return "";
}

const markdownComponents = {
  h2: (props) => (
    <h2
      className="mt-8 border-b border-white/15 pb-2 text-2xl font-bold tracking-tight first:mt-0"
      {...props}
    />
  ),
  h3: (props) => <h3 className="mt-5 text-base font-semibold first:mt-0" {...props} />,
  h4: (props) => <h4 className="mt-4 text-sm font-semibold first:mt-0" {...props} />,
  ul: (props) => <ul className="mt-2 list-disc space-y-1 pl-5 text-sm" {...props} />,
  li: (props) => <li className="opacity-90" {...props} />,
  p: ({ children, ...props }) => {
    const text = flattenText(Children.toArray(children)).trim();
    if (text === "Older changelog entries start below.") {
      return (
        <p
          className="mt-6 text-center text-lg font-bold opacity-95 first:mt-0"
          {...props}
        >
          {children}
        </p>
      );
    }
    return (
      <p className="mt-2 text-sm opacity-85 first:mt-0" {...props}>
        {children}
      </p>
    );
  },
  hr: (props) => <hr className="my-5 border-white/15" {...props} />,
};

export default async function ChangelogPage() {
  let content = "";
  try {
    content = await fs.readFile(path.join(process.cwd(), "CHANGELOG.md"), "utf8");
  } catch {
    content = "Changelog content could not be loaded.";
  }

  return (
    <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </section>
  );
}
