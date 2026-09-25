export const MODEL_CATALOG = {
  recommended: {
    id: 'qwen2.5-3b-instruct-q4km',
    displayName: 'Qwen 2.5 3B',
    fileName: 'qwen2.5-3b-instruct-q4_k_m.gguf',
    bytes: 2104932768,
    sha256: '626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d',
    url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf?download=true',
    source: 'Qwen/Qwen2.5-3B-Instruct-GGUF',
  },
  lightweight: {
    id: 'qwen3-1.7b-q4km',
    displayName: 'Qwen3 1.7B',
    fileName: 'Qwen3-1.7B-Q4_K_M.gguf',
    bytes: 1280000000,
    sha256: 'd2387ca2dbfee2ffabce7120d3770dadca0b293052bc2f0e138fdc940d9bc7b5',
    url: 'https://huggingface.co/ggml-org/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf?download=true',
    source: 'ggml-org/Qwen3-1.7B-GGUF',
  },
}

export function getModel(modelId) {
  const model = Object.values(MODEL_CATALOG).find((item) => item.id === modelId)
  if (!model) throw new Error('Unknown local model.')
  return model
}
