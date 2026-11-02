export const recConfig = {
  scoreWeights: {
    profile: 0.55,
    popularity: 0.25,
    freshness: 0.1,
    availability: 0.1,
  },
  coldStartWeights: {
    popularity: 0.7,
    freshness: 0.3,
  },
  mmrLambda: 0.72,
  candidatePoolMultiplier: 4,
  maximumCandidatePool: 80,
  defaultLimit: 10,
  maximumLimit: 20,
  explorationInterval: 5,
} as const;
