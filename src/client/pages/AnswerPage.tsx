import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mishkatApi } from '../api/mishkatApi.js';
import {
  AskResponse,
  FollowUpQuestion,
  CandidateChunk,
  EvidenceVerificationResult,
} from '../../shared/types/index.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';

export interface SupportingEvidenceItem {
  evidenceId: string;
  claimId: string;
  chunkId: string;
  sourceId: string;
  sourceName: string;
  documentId?: string;
  title?: string;
  excerpt: string;
  url?: string;
  isSpecificUrl: boolean;
  verificationStatus: 'SUPPORTED' | 'PARTIAL';
}

export interface VerifiedClaimItem {
  text: string;
  status: 'SUPPORTED' | 'PARTIAL';
  evidence: SupportingEvidenceItem[];
}

/**
 * Computes strictly verified claims from existing verification results with claim-level evidence traceability.
 * Follows Mishkat V2 Safe Patch 1 & 2 rules:
 * 1. Extracted/understanding claims are NOT verified claims.
 * 2. Uses ONLY existing verification results.
 * 3. SUPPORTED: show as supported with supporting verified evidence.
 * 4. PARTIAL: show only if confirmed partial support, labeled "مدعوم جزئياً", showing only partial evidence.
 * 5. UNSUPPORTED: never show as verified. No evidence = no verified display.
 * 6. If result is INSUFFICIENT and no supported claims: hide section completely.
 * 7. PERSONAL_FATWA, NEEDS_CLARIFICATION, SERVICE_ERROR: do not show verified claims.
 * 8. Never invent a URL: uses specific document URL when available, source homepage when only homepage exists, none otherwise.
 */
export function computeVerifiedClaims(data: AskResponse): VerifiedClaimItem[] {
  // Safe Patch 1 Rule 7: PERSONAL_FATWA, NEEDS_CLARIFICATION, SERVICE_ERROR: do not show verified claims.
  if (
    data.status === 'PERSONAL_FATWA' ||
    data.status === 'NEEDS_CLARIFICATION' ||
    data.status === 'SERVICE_ERROR' ||
    data.status === 'NOT_IMPLEMENTED'
  ) {
    return [];
  }

  // Safe Patch 1 Rule 1 & 2: Extracted claims are NOT verified claims; must have existing verification results.
  const evidenceList = data.evidence || [];
  if (evidenceList.length === 0) {
    return [];
  }

  // Pool of candidate chunks to pull provenance and excerpts from
  const candidatePool: CandidateChunk[] = [
    ...(data.candidates || []),
    ...(data.retrieval?.allCandidates || []),
  ];

  // Resolve candidate claims from retrieval.claimResults, understanding.claims, or data.claims
  const claimEntries: Array<{ id: string; text: string; index: number }> = [];

  if (data.retrieval?.claimResults && data.retrieval.claimResults.length > 0) {
    data.retrieval.claimResults.forEach((cr, idx) => {
      claimEntries.push({ id: cr.claimId, text: cr.claim, index: idx });
    });
  } else if (data.claims && data.claims.length > 0) {
    data.claims.forEach((c, idx) => {
      claimEntries.push({ id: `claim_${idx + 1}`, text: c, index: idx });
    });
  } else if (data.understanding?.claims && data.understanding.claims.length > 0) {
    data.understanding.claims.forEach((c, idx) => {
      claimEntries.push({ id: `claim_${idx + 1}`, text: c, index: idx });
    });
  } else {
    // If only evidence exists with unique claimIds
    const seen = new Set<string>();
    evidenceList.forEach((e, idx) => {
      if (e.claimId && !seen.has(e.claimId)) {
        seen.add(e.claimId);
        claimEntries.push({ id: e.claimId, text: e.claimId, index: idx });
      }
    });
  }

  if (claimEntries.length === 0) {
    return [];
  }

  const verifiedList: VerifiedClaimItem[] = [];

  for (const entry of claimEntries) {
    // Find all evidence items for this claim
    const matchingEvidence = evidenceList.filter((e) => {
      const eClaimId = String(e.claimId || '').trim();
      const entryId = String(entry.id || '').trim();
      const entryText = String(entry.text || '').trim();

      return (
        eClaimId === entryId ||
        eClaimId === `claim_${entry.index + 1}` ||
        eClaimId === entryText ||
        (entryId && eClaimId.toLowerCase() === entryId.toLowerCase())
      );
    });

    // Check verification statuses
    const supportedEvidence = matchingEvidence.filter((e) => e.verificationStatus === 'SUPPORTED');
    const partialEvidence = matchingEvidence.filter((e) => e.verificationStatus === 'PARTIAL');

    const isSupported = supportedEvidence.length > 0;
    const isPartial = !isSupported && partialEvidence.length > 0;

    // Determine target verification status and evidence list
    let targetStatus: 'SUPPORTED' | 'PARTIAL' | null = null;
    let relevantEvidence: EvidenceVerificationResult[] = [];

    if (isSupported) {
      targetStatus = 'SUPPORTED';
      relevantEvidence = supportedEvidence;
    } else if (isPartial) {
      targetStatus = 'PARTIAL';
      relevantEvidence = partialEvidence;
    } else {
      // Safe Patch 1 Rule 5: UNSUPPORTED: never show as verified
      continue;
    }

    // Map each relevant evidence to its provenance details
    const supportingItems: SupportingEvidenceItem[] = relevantEvidence.map((ev) => {
      const candidate = candidatePool.find((c) => c.chunkId === ev.chunkId);
      const citation = data.citations?.find((c) => c.chunkId === ev.chunkId);
      const source = data.sources?.find((s) => s.sourceId === (ev.sourceId || candidate?.sourceId));

      const sourceId = ev.sourceId || candidate?.sourceId || citation?.sourceId || 'src_unknown';
      const sourceName =
        candidate?.sourceName ||
        citation?.sourceName ||
        source?.name ||
        ev.sourceId;

      const title = candidate?.title || citation?.title;
      const documentId = candidate?.documentId || citation?.documentId;

      // Short relevant excerpt already stored
      let rawExcerpt = candidate?.content || (candidate as any)?.text || ev.relation || '';
      if (rawExcerpt.length > 250) {
        rawExcerpt = rawExcerpt.slice(0, 250).trim() + '...';
      }

      // Safe Patch 2 Rule 3: URL Truthfulness
      // Never invent a URL.
      // If a specific document URL exists in current provenance: use it.
      // If only the source homepage exists: show the homepage truthfully.
      // If no URL exists: do not fabricate one.
      const sourceHomepage = source?.officialUrl;
      const specificUrl = candidate?.sourceUrl || citation?.officialUrl;

      let finalUrl: string | undefined = undefined;
      let isSpecificUrl = false;

      if (specificUrl && typeof specificUrl === 'string' && specificUrl.trim().startsWith('http')) {
        const trimmedSpecific = specificUrl.trim();
        if (!sourceHomepage || trimmedSpecific !== sourceHomepage.trim()) {
          finalUrl = trimmedSpecific;
          isSpecificUrl = true;
        } else {
          finalUrl = sourceHomepage.trim();
          isSpecificUrl = false;
        }
      } else if (sourceHomepage && typeof sourceHomepage === 'string' && sourceHomepage.trim().startsWith('http')) {
        finalUrl = sourceHomepage.trim();
        isSpecificUrl = false;
      }

      return {
        evidenceId: ev.evidenceId,
        claimId: ev.claimId,
        chunkId: ev.chunkId,
        sourceId,
        sourceName,
        documentId,
        title,
        excerpt: rawExcerpt,
        url: finalUrl,
        isSpecificUrl,
        verificationStatus: targetStatus!,
      };
    });

    // Safe Patch 2 Rule 5: NO EVIDENCE = NO VERIFIED DISPLAY
    if (supportingItems.length === 0) {
      continue;
    }

    verifiedList.push({
      text: entry.text,
      status: targetStatus,
      evidence: supportingItems,
    });
  }

  // Safe Patch 1 Rule 6: If the final result is INSUFFICIENT and there are no supported claims:
  // hide the verified claims section completely.
  if (data.status === 'INSUFFICIENT') {
    const hasSupported = verifiedList.some((c) => c.status === 'SUPPORTED');
    if (!hasSupported) {
      return [];
    }
  }

  return verifiedList;
}

export const AnswerPage: React.FC = () => {
  const { interactionId } = useParams<{ interactionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AskResponse | null>(null);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  const verifiedClaims = useMemo(() => {
    if (!data) return [];
    return computeVerifiedClaims(data);
  }, [data]);

  useEffect(() => {
    if (!interactionId) return;

    const fetchInteraction = async () => {
      setLoading(true);
      setError(null);
      const res = await mishkatApi.getInteraction(interactionId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error?.message || 'تعذر تحميل بيانات التفاعل');
      }
      setLoading(false);
    };

    fetchInteraction();
  }, [interactionId]);

  const handleSelectFollowUp = async (followUp: FollowUpQuestion) => {
    if (!data) return;
    setSubmittingFollowUp(true);
    try {
      const res = await mishkatApi.askQuestion({
        sessionId: mishkatApi.getSessionId(),
        question: followUp.question,
        origin: 'DEEP_LEARNING',
        parentInteractionId: data.interactionId,
      });

      if (res.success && res.data) {
        navigate(`/answer/${res.data.interactionId}`);
      } else {
        setError(res.error?.message || 'تعذر إرسال سؤال التعلم العميق');
      }
    } catch {
      setError('حدث خطأ أثناء إرسال سؤال التعلم العميق');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  if (loading) {
    return <LoadingState message="جاري استرجاع نتيجة المسألة والأدلة..." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="خطأ في استرجاع الإجابة"
        message={error || 'لم يتم العثور على التفاعل المطلوب'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (data.status === 'PERSONAL_FATWA') {
    return (
      <div className="flex flex-col w-full px-gutter py-space-lg max-w-2xl mx-auto">
        <div className="p-space-lg rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm">
          <div className="flex items-center gap-space-sm mb-space-sm">
            <span className="material-symbols-outlined text-3xl text-amber-600">psychology_alt</span>
            <h2 className="font-headline-sm text-headline-sm font-bold">مسألة فتوى خاصة</h2>
          </div>
          <p className="font-body-md text-body-md mb-space-md leading-relaxed">
            {data.specialistReferral?.message ||
              'هذا السؤال يحتاج إلى فتوى تراعي تفاصيل الحالة، لذلك لا تقدّم مشكاة حكماً شخصياً عليه، ويمكن الرجوع إلى جهة إفتاء مختصة.'}
          </p>
          {data.specialistReferral?.authorityName && (
            <div className="mb-space-md p-space-sm bg-white/70 rounded-lg border border-amber-300/40">
              <span className="font-bold text-primary block">الجهة الرسمية المعتمدة:</span>
              <span className="text-sm text-on-surface">{data.specialistReferral.authorityName}</span>
            </div>
          )}
          <Link
            to="/specialist"
            className="inline-flex items-center gap-space-xs px-space-md py-space-sm bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors"
          >
            <span>التوجه إلى دليل الفتوى والمختصين المعتمدين</span>
            <span className="material-symbols-outlined text-base">arrow_back</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full px-gutter pb-space-xl max-w-2xl mx-auto">
      {/* Question Header Card */}
      <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_-2px_rgba(13,71,51,0.05)] border border-outline-variant/30 mb-space-md">
        <div className="flex items-center justify-between mb-space-xs">
          <span className="font-label-sm text-label-sm text-secondary bg-surface-container-low px-space-sm py-1 rounded-full font-bold">
            مسألة موثقة
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {data.status === 'ANSWERED' ? 'محققة بالأدلة' : 'قيد التحقيق'}
          </span>
        </div>
        <h1 className="font-headline-sm text-headline-sm text-primary font-bold mt-space-xs">
          {data.question}
        </h1>
      </div>

      {/* Answer Pane */}
      <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_-2px_rgba(13,71,51,0.05)] border border-outline-variant/30 mb-space-md">
        <div className="flex items-center gap-space-xs mb-space-sm text-primary">
          <span className="material-symbols-outlined text-xl">auto_stories</span>
          <h2 className="font-title-md text-title-md font-bold">البيان والتحقيق العلمي</h2>
        </div>
        <div className="font-body-lg text-body-lg text-on-surface leading-loose">
          {data.answer || 'لم يتم توليد نص الإجابة بعد.'}
        </div>
      </div>

      {/* Verified Claims */}
      {verifiedClaims.length > 0 && (
        <div
          data-testid="verified-claims-section"
          className="p-space-md bg-surface-container-low rounded-xl mb-space-md border border-outline-variant/20"
        >
          <h3 className="font-title-md text-title-md text-primary font-bold mb-space-xs flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary">checklist</span>
            <span>الدعاوى المستخلصة والمحققة</span>
          </h3>
          <ul className="space-y-3 font-body-sm text-body-sm text-on-surface-variant">
            {verifiedClaims.map((claim, idx) => (
              <li
                key={idx}
                data-testid={`verified-claim-${idx}`}
                className="p-space-sm rounded-lg bg-surface-container-lowest/80 border border-outline-variant/15 flex flex-col gap-space-xs"
              >
                {/* Claim Text & Status Badge */}
                <div className="flex items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-space-xs flex-1">
                    <span className="material-symbols-outlined text-sm text-secondary shrink-0">
                      {claim.status === 'SUPPORTED' ? 'check_circle' : 'change_circle'}
                    </span>
                    <span className="font-bold text-on-surface">{claim.text}</span>
                  </div>
                  {claim.status === 'PARTIAL' ? (
                    <span
                      data-testid="claim-badge-partial"
                      className="font-label-sm text-xs px-space-xs py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0"
                    >
                      مدعوم جزئياً
                    </span>
                  ) : (
                    <span
                      data-testid="claim-badge-supported"
                      className="font-label-sm text-xs px-space-xs py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0"
                    >
                      مدعوم
                    </span>
                  )}
                </div>

                {/* Supporting Evidence Traceability (الدليل الداعم) */}
                {claim.evidence && claim.evidence.length > 0 && (
                  <div
                    data-testid={`supporting-evidence-box-${idx}`}
                    className="mt-1 pt-space-xs border-t border-outline-variant/15 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-1 font-label-sm text-xs text-secondary font-bold">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      <span>الدليل الداعم</span>
                    </div>

                    {claim.evidence.map((ev, evIdx) => (
                      <div
                        key={ev.evidenceId || `${ev.chunkId}_${evIdx}`}
                        data-testid={`supporting-evidence-item-${idx}-${evIdx}`}
                        className="bg-surface-container-low/60 p-space-xs rounded border border-outline-variant/15 text-xs text-on-surface flex flex-col gap-1"
                      >
                        {/* Source Name & Document Title */}
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span
                            data-testid={`evidence-source-name-${idx}-${evIdx}`}
                            className="font-bold text-primary"
                          >
                            {ev.sourceName}
                            {ev.title ? ` — ${ev.title}` : ''}
                          </span>

                          {/* Original Source URL when available */}
                          {ev.url && (
                            <a
                              data-testid={`evidence-source-url-${idx}-${evIdx}`}
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-secondary hover:text-primary flex items-center gap-0.5 font-medium hover:underline text-[11px]"
                              aria-label="رابط المصدر"
                            >
                              <span>{ev.isSpecificUrl ? 'رابط المسألة المعتمدة' : 'الموقع الرسمي للمصدر'}</span>
                              <span className="material-symbols-outlined text-xs">open_in_new</span>
                            </a>
                          )}
                        </div>

                        {/* Short Relevant Evidence Excerpt */}
                        {ev.excerpt && (
                          <p
                            data-testid={`evidence-excerpt-${idx}-${evIdx}`}
                            className="text-on-surface-variant leading-relaxed bg-surface-container-lowest/90 p-1.5 rounded border border-outline-variant/10 italic text-[11px]"
                          >
                            «{ev.excerpt}»
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources & Citations */}
      {data.sources && data.sources.length > 0 && (
        <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 mb-space-md">
          <h3 className="font-title-md text-title-md text-primary font-bold mb-space-xs flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary">menu_book</span>
            <span>المصادر المعتمدة المرجعية</span>
          </h3>
          <div className="flex flex-col gap-space-xs">
            {data.sources.map((src) => (
              <div
                key={src.sourceId}
                className="p-space-sm rounded-lg bg-surface-container-low/60 flex items-center justify-between"
              >
                <div>
                  <span className="font-body-md text-body-md text-primary font-bold block">
                    {src.name}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {src.author} ({src.category})
                  </span>
                </div>
                {src.officialUrl && (
                  <a
                    href={src.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:text-primary"
                    aria-label="رابط المصدر"
                  >
                    <span className="material-symbols-outlined">open_in_new</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deep Learning Follow-Up Questions Section */}
      {data.followUps && data.followUps.length > 0 && (
        <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30">
          <div className="flex items-center justify-between mb-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary">psychology</span>
              <h3 className="font-title-md text-title-md text-primary font-bold">
                تعمّق أكثر
              </h3>
            </div>
            <Link
              to={`/deep-learning/${data.interactionId}`}
              className="font-label-sm text-label-sm text-secondary hover:underline"
            >
              عرض الكل
            </Link>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
            تعمّق في جوانب هذه المسألة عبر مسار التحقيق ذاته:
          </p>

          <div className="flex flex-col gap-space-sm">
            {data.followUps.map((fu) => (
              <button
                key={fu.id}
                type="button"
                disabled={submittingFollowUp}
                onClick={() => handleSelectFollowUp(fu)}
                className="w-full p-space-sm bg-surface-container-low rounded-lg text-right hover:bg-surface-container transition-all flex items-center justify-between group border border-outline-variant/20 disabled:opacity-50"
              >
                <div className="flex flex-col">
                  <span className="font-body-md text-body-md text-on-surface group-hover:text-primary font-medium">
                    {fu.question}
                  </span>
                  {fu.type && (
                    <span className="font-label-sm text-label-sm text-secondary font-bold">
                      مسار: {fu.type}
                    </span>
                  )}
                </div>
                <span className="material-symbols-outlined text-outline group-hover:text-primary text-xl">
                  chevron_left
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
