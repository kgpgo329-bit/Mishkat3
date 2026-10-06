import { Router, Request, Response, NextFunction } from 'express';
import {
  SpecialistReferralResponse,
  OFFICIAL_REFERRAL_AUTHORITY,
  PERSONAL_FATWA_NOTICE,
  SPECIALIST_WHY_REFER,
} from '../../shared/types/index.js';

export const specialistRouter = Router();

export const OFFICIAL_SPECIALIST_DATA: SpecialistReferralResponse = {
  message: PERSONAL_FATWA_NOTICE,
  whyRefer: SPECIALIST_WHY_REFER,
  disclaimer:
    'تنبيه شرعي ونظامي: منصة مشكاة تقدم محتوى معرفياً توثيقياً عاماً ومستنداً للأدلة المعتمدة، ولا تصدر فتاوى فردية أو أحكاماً في النوازل الشخصية (مثل قضايا الطلاق، المواريث المحددة، والنزاعات الخاصة). للفتوى الخاصة، يرجى مراجعة جهة الإفتاء الرسمية المعتمدة.',
  referralNotice:
    'هذا السؤال يحتاج إلى فتوى تراعي تفاصيل الحالة، لذلك لا تقدّم مشكاة حكماً شخصياً عليه، ويمكن الرجوع إلى جهة إفتاء مختصة.',
  authorityName: OFFICIAL_REFERRAL_AUTHORITY.authorityName,
  officialWebsite: OFFICIAL_REFERRAL_AUTHORITY.officialWebsite,
  contactMethods: OFFICIAL_REFERRAL_AUTHORITY.contactMethods,
  purpose: OFFICIAL_REFERRAL_AUTHORITY.purpose,
  authority: OFFICIAL_REFERRAL_AUTHORITY,
  officialEntities: [
    {
      id: 'fatwa_sa',
      name: OFFICIAL_REFERRAL_AUTHORITY.authorityName,
      organization: 'المملكة العربية السعودية',
      specialty: 'الفتاوى العامة والنوازل والأحوال الشخصية والعبادات والمعاملات',
      jurisdiction: 'المملكة العربية السعودية والعالم الإسلامي',
      workingHours: 'الأحد - الخميس (8:00 ص - 2:00 م)',
      notes: 'الجهة الرسمية المعتمدة للإفتاء وبحوث هيئة كبار العلماء.',
      channels: [
        {
          type: 'portal',
          label: 'الموقع الرسمي',
          value: OFFICIAL_REFERRAL_AUTHORITY.officialWebsite,
        },
        {
          type: 'phone',
          label: 'الهاتف الموحد',
          value: OFFICIAL_REFERRAL_AUTHORITY.contactMethods.unifiedPhone,
        },
        {
          type: 'email',
          label: 'بريد الأسئلة الشرعية',
          value: OFFICIAL_REFERRAL_AUTHORITY.contactMethods.religiousQuestionsEmail,
        },
        {
          type: 'email',
          label: 'البريد الإداري',
          value: OFFICIAL_REFERRAL_AUTHORITY.contactMethods.administrativeEmail,
        },
      ],
    },
  ],
};

specialistRouter.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({
      success: true,
      data: OFFICIAL_SPECIALIST_DATA,
    });
  } catch (error) {
    next(error);
  }
});
