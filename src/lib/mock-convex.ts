// Mock Convex hooks for build process
export const useQuery = () => null
export const useMutation = () => () => Promise.resolve(null)
export const useAction = () => () => Promise.resolve(null)

export const mockApi = {
  users: {
    createUser: 'users:createUser',
    getCurrentUser: 'users:getCurrentUser',
    updateYouTubeCredentials: 'users:updateYouTubeCredentials',
    getUserById: 'users:getUserById'
  },
  youtube: {
    analyzeTopVideos: 'youtube:analyzeTopVideos',
    getTopVideos: 'youtube:getTopVideos',
    uploadVideo: 'youtube:uploadVideo'
  },
  content: {
    generateVideoIdeas: 'content:generateVideoIdeas',
    getVideoIdeasByUser: 'content:getVideoIdeasByUser',
    approveVideoIdea: 'content:approveVideoIdea',
    generateScript: 'content:generateScript'
  },
  revid: {
    createVideo: 'revid:createVideo',
    handleWebhook: 'revid:handleWebhook'
  },
  systemLogs: {
    getRecentLogs: 'systemLogs:getRecentLogs'
  }
};