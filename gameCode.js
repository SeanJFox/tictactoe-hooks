judge = arr => {
  let patterns = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[0,4,8],[2,4,6],[2,5,8]];
  let pattern = patterns.filter(x => x.every(y => arr[y] === 'o') || x.every(y => arr[y] === 'x'));
  return pattern.length ? 
    {result: 'win', pattern: pattern[0], character: pattern[0][0]} : 
    {result: 'none'};
};

module.exports = {
  judge: judge
};