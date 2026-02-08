import fs from "fs/promises";
import path from "path";
import ReactMarkdown from "react-markdown";

const markdownComponents = {
  h2: (props) => <h2 className="mt-6 text-lg font-semibold first:mt-0" {...props} />,
  ul: (props) => <ul className="mt-2 list-disc space-y-1 pl-5 text-sm" {...props} />,
  li: (props) => <li className="opacity-90" {...props} />,
  p: (props) => <p className="text-sm opacity-85" {...props} />,
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
