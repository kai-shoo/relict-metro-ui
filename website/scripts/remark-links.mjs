// Keep Markdown usable on GitHub and under the website's deployment path.
export default function remarkLinks({ base = '' } = {}) {
  return (tree) => {
    function visit(node) {
      if ((node.type === 'link' || node.type === 'definition') && node.url) {
        const url = node.url;
        if (/^(?:\.\.\/)?examples\//.test(url)) {
          node.url = url.replace(/^(?:\.\.\/)?examples\//, '/examples/');
        } else if (/^(?:\.\.\/)?README\.md(?:#.*)?$/.test(url)) {
          node.url = url.replace(/^(?:\.\.\/)?README\.md/, '/reference/readme/');
        } else if (/^(?:\.\/|docs\/)?[\w-]+\.md(?:#.*)?$/.test(url)) {
          node.url = url.replace(/^(?:\.\/|docs\/)?([\w-]+)\.md/, '/reference/$1/');
        } else if (/^(?:\.\.\/)?(?:src|tests|scripts|website|\.github)\//.test(url)) {
          node.url = `https://github.com/kai-shoo/relict-metro-ui/blob/main/${url.replace(/^\.\.\//, '')}`;
        }
        if (node.url.startsWith('/') && !node.url.startsWith('//')) {
          node.url = `${base.replace(/\/$/, '')}${node.url}`;
        }
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
  };
}
