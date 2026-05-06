export default function JsonView({ data }) {
  const html = JSON.stringify(data, null, 2)
    .replace(/("[\w\s]+")\s*:/g,  '<span class="k">$1</span>:')
    .replace(/:\s*(".*?")/g,       ': <span class="s">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g,  ': <span class="n">$1</span>');
  return <div className="json-view" dangerouslySetInnerHTML={{ __html: html }} />;
}
