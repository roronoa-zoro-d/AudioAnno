
export const createSegment = (start, end, text = '', color) => {
  return {
    seg: [start, end],
    text,
    color,
    id: `seg-${start}-${end}-${Math.random().toString(36).substr(2, 9)}`
  };
};


export const addSegment = (segments, newSegment) => {
  return [...segments, newSegment].sort((a, b) => a.seg[0] - b.seg[0]);
};


export const updateSegment = (segments, id, updates) => {
  const index = segments.findIndex(s => s.id === id);
  if (index === -1) return segments;
  
  const updated = [...segments];
  updated[index] = { ...updated[index], ...updates };
  
  // 如果更新时间范围，需要重新排序
  if (updates.seg) {
    return updated.sort((a, b) => a.seg[0] - b.seg[0]);
  }
  return updated;
};


export const removeSegment = (segments, id) => {
  return segments.filter(s => s.id !== id);
};


export const mergeSegments = (segments) => {
  if (segments.length <= 1) return segments;
  
  const sorted = [...segments].sort((a, b) => a.seg[0] - b.seg[0]);
  const result = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const last = result[result.length - 1];
    const current = sorted[i];
    
    if (current.seg[0] <= last.seg[1]) {
      // 有重叠或相邻，合并
      last.seg[1] = Math.max(last.seg[1], current.seg[1]);
      last.text = last.text || current.text;
    } else {
      result.push(current);
    }
  }
  
  return result;
};


export const validateSegment = (segment) => {
  return (
    Array.isArray(segment.seg) &&
    segment.seg.length === 2 &&
    segment.seg[0] >= 0 &&
    segment.seg[1] > segment.seg[0]
  );
};