import { create } from 'zustand';

const useAudioStore = create((set) => ({
  // 高亮区域数组
  highlightedRegions: [],
  
  // 添加一个高亮区域
  addRegion: (region) => set((state) => {
    const exists = state.highlightedRegions.some(r => r.id === region.id);
    if (exists) {
      console.log(`[audioStore] 已存在区域，未重复添加: ${region.id}`);
      return state;
    }
    console.log(`[audioStore] 添加区域: ${region.id} (添加前总数: ${state.highlightedRegions.length}) `);
    return {
      highlightedRegions: [region, ...state.highlightedRegions]
    };
  }),
  
  // 根据ID删除高亮区域
  removeRegion: (regionId) => set((state) => {
    console.log(`[audioStore] 删除区域: ${regionId}, (删除前总数: ${state.highlightedRegions.length}) `,);
    return {
      highlightedRegions: state.highlightedRegions.filter(
        region => region.id !== regionId
      )
    };
  }),
  
  // 更新指定ID的区域
  updateRegion: (regionId, updatedData) => set((state) => {
    console.log(`[audioStore] 更新区域: ${regionId}`);
    return {
      highlightedRegions: state.highlightedRegions.map(region => 
        region.id === regionId ? { ...region, ...updatedData } : region
      )
    };
  }),
  
  // 清除所有高亮区域
  clearRegions: () => {
    console.log('[audioStore] 清空所有高亮区域');
    set({ highlightedRegions: [] });
  },
  
  // 替换整个高亮区域数组（谨慎使用）
  setRegions: (regions) => {
    console.log('[audioStore] 重置所有高亮区域');
    set({ highlightedRegions: regions });
  },
}));

export default useAudioStore;
