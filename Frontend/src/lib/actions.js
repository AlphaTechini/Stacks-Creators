/**
 * A Svelte action that prevents the default behavior of an event.
 * @param {HTMLElement} node The element the action is applied to.
 */
export function preventDefault(node) {
  node.addEventListener('submit', (event) => {
    event.preventDefault();
  });
}
