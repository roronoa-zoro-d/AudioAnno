import { create } from 'zustand';

// 创建 Store
const useAnnotationStore = create((set, get) => ({
  // 状态
  annotations: [], // 标注数据数组，格式: { id: string, seg: [number, number], text: string, ... }
  currentAudioId: null,
  loading: false,

  // Actions

  /**
   * 1. 设置标注数据（直接复制传入的数组并进行排序）
   * @param {Array} annotationsArray - 标注数据数组
   */
  setAnnotations: (annotationsArray) => {
    // 复制数组并按 seg[0]（开始时间戳）进行排序
    const sortedAnnotations = [...annotationsArray].sort((a, b) => a.seg[0] - b.seg[0]);
    set({ annotations: sortedAnnotations });
  },

  /**
   * 2. 增加一个标注数据
   * @param {Object} annotation - 标注对象
   */
  addAnnotation: (annotation) => {
    const currentAnnotations = get().annotations;
    
    // 将新标注插入到数组中
    const updatedAnnotations = [...currentAnnotations, annotation];
    
    // 按照 seg[0]（开始时间戳）进行排序
    updatedAnnotations.sort((a, b) => a.seg[0] - b.seg[0]);
    
    set({ annotations: updatedAnnotations });
  },

  /**
   * 3. 根据ID删除标注数据
   * @param {string} id - 要删除的标注ID
   */
  deleteAnnotation: (id) => {
    const currentAnnotations = get().annotations;
    
    // 过滤掉指定ID的标注
    const updatedAnnotations = currentAnnotations.filter(anno => anno.id !== id);
    
    set({ annotations: updatedAnnotations });
  },

  /**
   * 4.1 更新标注的时间段（seg）
   * @param {string} id - 要更新的标注ID
   * @param {number} start - 新的开始时间
   * @param {number} end - 新的结束时间
   */
  updateAnnotationSegment: (id, start, end) => {
    const currentAnnotations = get().annotations;
    
    // 更新指定ID的标注时间段
    const updatedAnnotations = currentAnnotations.map(anno => 
      anno.id === id 
        ? { ...anno, seg: [start, end] } 
        : anno
    );
    
    // 更新时间段后需要重新排序
    updatedAnnotations.sort((a, b) => a.seg[0] - b.seg[0]);
    
    set({ annotations: updatedAnnotations });
  },

  /**
   * 4.2 更新指定索引位置的标注属性
   * @param {number} index - 要更新的标注在数组中的索引
   * @param {string} key - 要更新的属性名
   * @param {any} value - 新的属性值
   */
  updateAnnotationByIndex: (index, key, value) => {
    const currentAnnotations = get().annotations;
    
    // 确保索引有效
    if (index < 0 || index >= currentAnnotations.length) {
      console.error(`Invalid index: ${index}`);
      return;
    }
    
    // 创建新的数组副本
    const updatedAnnotations = [...currentAnnotations];
    
    // 更新指定索引位置的属性
    updatedAnnotations[index] = {
      ...updatedAnnotations[index],
      [key]: value
    };
    
    // 如果更新的是seg[0]（开始时间），需要重新排序
    if (key === 'seg' || (key === 'seg' && Array.isArray(value) && value.length > 0)) {
      updatedAnnotations.sort((a, b) => a.seg[0] - b.seg[0]);
    }
    
    set({ annotations: updatedAnnotations });
  },

  /**
   * 4.3 根据ID更新标注属性
   * @param {string} id - 要更新的标注ID
   * @param {string} key - 要更新的属性名
   * @param {any} value - 新的属性值
   */
  updateAnnotationById: (id, key, value) => {
    const currentAnnotations = get().annotations;
    
    // 创建新的数组副本
    let updatedAnnotations = [...currentAnnotations];
    
    // 更新指定ID的标注属性
    updatedAnnotations = updatedAnnotations.map(anno => 
      anno.id === id 
        ? { ...anno, [key]: value } 
        : anno
    );
    
    // 如果更新的是seg[0]（开始时间），需要重新排序
    if (key === 'seg' || (key === 'seg' && Array.isArray(value) && value.length > 0)) {
      updatedAnnotations.sort((a, b) => a.seg[0] - b.seg[0]);
    }
    
    set({ annotations: updatedAnnotations });
  },

  /**
   * 5. 清空所有标注
   */
  clearAnnotations: () => {
    set({ annotations: [] });
  },

  /**
   * 6. 设置当前音频ID
   * @param {string} audioId - 音频ID
   */
  setCurrentAudio: (audioId) => {
    set({ currentAudioId: audioId });
  },

  /**
   * 7. 设置加载状态
   * @param {boolean} isLoading - 是否正在加载
   */
  setLoading: (isLoading) => {
    set({ loading: isLoading });
  },

  /**
   * 8. 获取指定ID的标注
   * @param {string} id - 标注ID
   * @returns {Object|null} 找到的标注对象或null
   */
  getAnnotationById: (id) => {
    const annotations = get().annotations;
    return annotations.find(anno => anno.id === id) || null;
  },

  /**
   * 9. 获取指定索引的标注
   * @param {number} index - 索引位置
   * @returns {Object|undefined} 找到的标注对象或undefined
   */
  getAnnotationByIndex: (index) => {
    const annotations = get().annotations;
    return annotations[index];
  },

  /**
   * 10. 根据ID查找标注的索引
   * @param {string} id - 标注ID
   * @returns {number} 找到的索引位置，未找到返回-1
   */
  findAnnotationIndex: (id) => {
    const annotations = get().annotations;
    return annotations.findIndex(anno => anno.id === id);
  }
}));


export default useAnnotationStore;