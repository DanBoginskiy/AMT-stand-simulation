// Tiny DOM helpers.

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

// A labeled visualization block containing a canvas; returns { block, canvas }.
export function vizBlock(title, canvas) {
  const block = el('div', { class: 'viz-block' }, [el('h3', { text: title }), canvas]);
  return block;
}

export function chip(label, value, cls = '') {
  return el('span', { class: 'chip ' + cls, html: `${label} <b>${value}</b>` });
}

export function chips(items) {
  return el('div', { class: 'data-summary' }, items);
}
