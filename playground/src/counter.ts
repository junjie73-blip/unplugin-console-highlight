export function setupCounter(element: HTMLButtonElement) {
  let counter = 0
  const setCounter = (count: number) => {
    counter += count
    element.innerHTML = `count is ${counter}`
    console.log('counter:', counter, { nested: { ok: true, list: [1, 'two', null] } })
    console.info('info message', 3.14)
    console.warn('warn message', new Map([['key', 'value']]))
    console.error('error message', new Error('demo'))
    console.debug('debug message', [1, 2, 3])
  }
  element.addEventListener('click', () => setCounter(counter + 1))
  setCounter(0)
}
