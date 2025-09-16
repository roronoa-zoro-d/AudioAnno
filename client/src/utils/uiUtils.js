
/**
 * 高亮文本函数，根据类型为文本添加背景色
 * @param {string} text - 需要高亮的文本
 * @param {string} type - 高亮类型，支持 'insert'、'delete'、'replace'
 * @returns {string} - 返回带有背景色的HTML字符串
 */
export const highlightText = (text, type) => {
  const color = type === 'insert' ? '#c8e6c9' :
               type === 'delete' ? '#ffcdd2' :
               type === 'replace' ? '#ffcc80' : 'transparent';
  return `<span style="background-color: ${color}">${text}</span>`;
};

/**
 * 对齐并高亮两段文本的差异部分
 * @param {string[]} text1 - 第一段文本，以数组形式传入
 * @param {string[]} text2 - 第二段文本，以数组形式传入
 * @returns {Object} - 返回包含高亮后的两段文本的对象
 */
export const renderAlignedText = (text1, text2) => {
  const words1 = text1 || [];
  const words2 = text2 || [];
  const maxLength = Math.max(words1.length, words2.length);
  const result1 = [];
  const result2 = [];

  for (let i = 0; i < maxLength; i++) {
    const word1 = words1[i] || '' ;
    const word2 = words2[i] || '' ;

    if (word1 === '' && word2 !== '') {
      result2.push(highlightText(word2, 'insert'));
    } else if (word1 !== '' && word2 === '') {
      result1.push(highlightText(word1, 'delete'));
    } else if (word1 !== word2) {
      result1.push(highlightText(word1, 'replace'));
      result2.push(highlightText(word2, 'replace'));
    } else {
      result1.push(word1);
      result2.push(word2);
    }
  }

  return {
    text1: result1.join(''),
    text2: result2.join('')
  };
};