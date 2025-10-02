import { create } from 'zustand';

/*
服务器返回数据：
 {"audios": utts, "state":utt2annoState, "anno":utt2annoData}
音频状态annoState示例： 
{'annotator': '', 'last_updated': '', 'anno_status': 'unlabeled', 'check_status': 'unchecked', 'submit_times': 0, 'utt': '0001a8854ed70a355809a58759bf67d9_ch0'}
音频标注数据annoData示例 
[
    {'seg': [11580, 21605], 'text': '啊你好打扰了啊麻烦帮我核实一下一个快件的取件码它显示三十一号就签收了但是客户说没有收到核实一下取件码后五位是八二六零八圆通客服啊'}, 
    {'seg': [23480, 24035], 'text': '对'}, 
    {'seg': [24600, 26485], 'text': '对后位八二六零八'}, 
    {'seg': [43860, 47035], 'text': '那你那你跟客户解释一下呗我把他的电话给你好吧'}, 
    {'seg': [49470, 49965], 'text': '哦'}, 
    {'seg': [52560, 58895], 'text': '但因为他没有收到就是比较生气在这边我看他提取还蛮激动的所以我立马联系了麻烦您现在这边给他联系一下啊'}, 
    {'seg': [61230, 66175], 'text': '啊我我也要给他回复一下然后这个件就是说是明天能给他送过去是吗'}, 
    {'seg': [69890, 70845], 'text': '这个啊'}, 
    {'seg': [74690, 75325], 'text': '二'}, 
    {'seg': [76850, 77755], 'text': '嗯好好好'}, 
    {'seg': [78310, 79015], 'text': '就是说'}, 
    {'seg': [83340, 86625], 'text': '好我已经跟他解释了就明天明天上午是吧可以吗'}, 
    {'seg': [87750, 90295], 'text': '嗯好好行行行谢谢啊我给他联系一下啊'}, 
    {'seg': [91240, 91915], 'text': '嗯再见'}
]
*/

const useDatasetAnnotationStore = create((set, get) => ({
  // 音频列表
  audioList: [],
  // 音频状态映射 { [audioId]: annoState }
  audioStates: {},
  // 音频标注数据 { [audioId]: annoData }
  audioAnnotations: {},

  
  // 设置音频列表
  setAudioList: (audios) => set({ audioList: audios }),
  
  // 设置音频状态
  setAudioStates: (states) => set({ audioStates: states }),
  
  // 设置音频标注数据
  setAudioAnnotations: (annotations) => set({ audioAnnotations: annotations }),
  

  
  // 更新单个音频的状态（完整annoState对象）
  updateAudioStatus: (audioId, statusData) => set((state) => {
    const updatedState = {
      ...state.audioStates,
      [audioId]: { 
        ...state.audioStates[audioId],
        ...statusData,
        // 确保包含所有必要字段
        utt: audioId, // 保持音频ID一致
        last_updated: statusData.last_updated || new Date().toISOString().split('T')[0] // 格式化日期
      }
    };
    
    return {
      audioStates: updatedState
    };
  }),
  
  // 更新单个音频的标注数据（完整annoData数组）
  updateAudioAnnotation: (audioId, annotation) => set((state) => {
    const updatedAnnotations = {
      ...state.audioAnnotations,
      [audioId]: annotation
    };
    
    return {
      audioAnnotations: updatedAnnotations
    };
  }),

  // 获取指定音频的状态信息
  getAudioState: (audioId) => {
    const state = get();
    if (!audioId) return null;
    return state.audioStates[audioId] || null;
  },

  // 获取指定音频的标注数据
  getAudioAnnotation: (audioId) => {
    const state = get();
    if (!audioId) return null;
    return state.audioAnnotations[audioId] || null;
  },




  
  // 从API获取数据并更新store（简化版本）
  fetchAudioData: async (datasetName, splitName) => {
    if (!datasetName || !splitName) return;
    
    try {
      const url = `http://localhost:9801/api/dataset/anno_list/${datasetName}/${splitName}`;
      const response = await fetch(url);
      const data = await response.json();
      
      set({
        audioList: data.audios || [],
        audioStates: data.state || {},
        audioAnnotations: data.anno || {}
      });
      
      console.log('获取到音频列表:', (data.audios || []).length, '个音频');
      console.log('获取到音频状态:', Object.keys(data.state || {}).length, '个音频');
      console.log('获取到的音频状态示例：', data.state && data.audios.length > 0 ? data.state[data.audios[0]] : '无');
      console.log('获取到音频标注示例:', data.anno && data.audios.length > 0 ? data.anno[data.audios[0]] : '无');
    } catch (error) {
      console.error('获取音频列表失败:', error);
    }
  }
}));

export default useDatasetAnnotationStore;