
const empty = {};
module.exports = empty;
module.exports.default = empty;
module.exports.context = {
  active: () => empty,
  with: (_ctx, fn) => typeof fn === "function" ? fn() : undefined,
};
module.exports.trace = {
  getTracer: () => ({
    startSpan: () => ({
      end: () => {},
      setAttribute: () => {},
      setAttributes: () => {},
      recordException: () => {},
      setStatus: () => {},
    }),
  }),
};
