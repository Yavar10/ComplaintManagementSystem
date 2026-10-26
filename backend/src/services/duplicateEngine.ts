import { prisma } from '../config/index.js';
import { RelationshipType, ReviewStatus } from '@prisma/client';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'college', 'institute', 'department', 'student', 'students',
  'aicte', 'complaint', 'university', 'this', 'there', 'their', 'very', 'not'
]);

export function normalizeText(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// Jaccard similarity between two token arrays
export function computeTokenSimilarity(tokensA: string[], tokensB: string[]): { score: number; shared: string[] } {
  if (!tokensA.length || !tokensB.length) return { score: 0, shared: [] };
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  const sharedTokens = Array.from(setA).filter((t) => setB.has(t));
  const unionSize = new Set([...setA, ...setB]).size;

  const score = unionSize > 0 ? sharedTokens.length / unionSize : 0;
  return { score, shared: sharedTokens };
}

// Compute Dice bigram similarity on title strings
export function computeTitleSimilarity(strA: string, strB: string): number {
  const normA = strA.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normB = strB.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normA.length || !normB.length) return 0;
  if (normA === normB) return 1.0;

  const getBigrams = (s: string) => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.substring(i, i + 2);
      bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
    }
    return bigrams;
  };

  const bgA = getBigrams(normA);
  const bgB = getBigrams(normB);
  let intersection = 0;

  for (const [bg, countA] of bgA.entries()) {
    if (bgB.has(bg)) {
      intersection += Math.min(countA, bgB.get(bg)!);
    }
  }

  const total = (normA.length - 1) + (normB.length - 1);
  return total > 0 ? (2.0 * intersection) / total : 0;
}

export interface DuplicateDetectionResult {
  relatedComplaintId: string;
  complaintNumber: string;
  title: string;
  similarityScore: number;
  relationshipType: RelationshipType;
  sharedKeywords: string[];
  explanation: string;
}

export async function detectRelatedComplaints(complaintId: string): Promise<DuplicateDetectionResult[]> {
  const target = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { institution: true, category: true },
  });

  if (!target) return [];

  const targetTokensDesc = normalizeText(target.description);
  const targetTokensTitle = normalizeText(target.title);

  // Retrieve candidate complaints: either same institution or sharing category or submitted recently
  const candidates = await prisma.complaint.findMany({
    where: {
      id: { not: complaintId },
      OR: [
        { institutionId: target.institutionId },
        { categoryId: target.categoryId },
      ],
    },
    include: { institution: true, category: true },
    take: 50,
  });

  const results: DuplicateDetectionResult[] = [];

  for (const cand of candidates) {
    const candTokensDesc = normalizeText(cand.description);
    const titleSim = computeTitleSimilarity(target.title, cand.title);
    const { score: descSim, shared } = computeTokenSimilarity(targetTokensDesc, candTokensDesc);

    const isSameInstitution = target.institutionId === cand.institutionId;
    const isSameCategory = target.categoryId === cand.categoryId;

    const instWeight = isSameInstitution ? 1.0 : 0.0;
    const catWeight = isSameCategory ? 1.0 : 0.0;

    // Weighted composite formulation:
    // 35% Title, 35% Description, 20% Institution, 10% Category
    const compositeScore = (0.35 * titleSim) + (0.35 * descSim) + (0.20 * instWeight) + (0.10 * catWeight);
    const roundedScore = Math.round(compositeScore * 100) / 100;

    if (roundedScore >= 0.40) {
      const type: RelationshipType = roundedScore >= 0.70
        ? RelationshipType.POSSIBLE_DUPLICATE
        : RelationshipType.RELATED;

      const reasons: string[] = [];
      if (isSameInstitution) reasons.push('Identical Institution (+20%)');
      if (titleSim > 0.4) reasons.push(`High title similarity (${Math.round(titleSim * 100)}%)`);
      if (descSim > 0.3) reasons.push(`Shared description keywords (${shared.slice(0, 5).join(', ')})`);
      if (isSameCategory) reasons.push('Same grievance category (+10%)');

      results.push({
        relatedComplaintId: cand.id,
        complaintNumber: cand.complaintNumber,
        title: cand.title,
        similarityScore: roundedScore,
        relationshipType: type,
        sharedKeywords: shared,
        explanation: reasons.join('; '),
      });

      // Persist or update relationship in database
      await prisma.complaintRelationship.upsert({
        where: {
          complaintId_relatedComplaintId: {
            complaintId: target.id,
            relatedComplaintId: cand.id,
          },
        },
        update: {
          similarityScore: roundedScore,
          relationshipType: type,
          detectionMethod: 'HEURISTIC_TFIDF',
        },
        create: {
          complaintId: target.id,
          relatedComplaintId: cand.id,
          similarityScore: roundedScore,
          relationshipType: type,
          detectionMethod: 'HEURISTIC_TFIDF',
          status: ReviewStatus.PENDING,
        },
      });
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.similarityScore - a.similarityScore);
  return results;
}
