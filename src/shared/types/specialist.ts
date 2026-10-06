export interface SpecialistContactMethods {
  unifiedPhone: string;
  religiousQuestionsEmail: string;
  administrativeEmail: string;
}

export interface OfficialReferralAuthority {
  authorityName: string;
  officialWebsite: string;
  purpose: string;
  contactMethods: SpecialistContactMethods;
}

export interface ContactChannel {
  type: 'phone' | 'portal' | 'center' | 'email';
  label: string;
  value: string;
}

export interface SpecialistEntity {
  id: string;
  name: string;
  organization: string;
  specialty: string;
  channels: ContactChannel[];
  jurisdiction: string;
  workingHours: string;
  notes: string;
}

export interface SpecialistReferralInfo {
  message: string;
  whyRefer?: string;
  authorityName: string;
  officialWebsite: string;
  contactMethods: SpecialistContactMethods;
  purpose: string;
  authority?: OfficialReferralAuthority;
}

export interface SpecialistReferralResponse {
  message: string;
  whyRefer?: string;
  disclaimer?: string;
  referralNotice?: string;
  authorityName: string;
  officialWebsite: string;
  contactMethods: SpecialistContactMethods;
  purpose: string;
  authority: OfficialReferralAuthority;
  officialEntities?: SpecialistEntity[];
}

export const PERSONAL_FATWA_NOTICE =
  'هذا السؤال يحتاج إلى فتوى تراعي تفاصيل الحالة، لذلك لا تقدّم مشكاة حكماً شخصياً عليه، ويمكن الرجوع إلى جهة إفتاء مختصة.';

export const SPECIALIST_WHY_REFER =
  'منصة مشكاة تقدم معرفة إسلامية عامة ومؤصلة مستندة إلى مصادر موثوقة، ولا تقدم فتاوى خاصة بالنوازل الشخصية (كالطلاق والنزاعات المحددة) لأنها تتطلب سماع الأطراف واستفصال المفتي المؤهل.';

export const OFFICIAL_REFERRAL_AUTHORITY: OfficialReferralAuthority = {
  authorityName: 'الرئاسة العامة للبحوث العلمية والإفتاء',
  officialWebsite: 'https://www.alifta.gov.sa',
  purpose: 'الإحالة الرسمية المعتمدة للأسئلة والنوازل الشخصية التي تستوجب فتوى خاصة تراعي تفاصيل الحالة.',
  contactMethods: {
    unifiedPhone: '0114595555',
    religiousQuestionsEmail: 'alifta@alifta.gov.sa',
    administrativeEmail: 'info@alifta.gov.sa',
  },
};
