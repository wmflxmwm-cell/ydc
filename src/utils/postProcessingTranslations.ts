// 후공정 번역 매핑
export const postProcessingTranslations: Record<string, { ko: string; vi: string }> = {
  '가공': { ko: '가공', vi: 'Gia công' },
  '밀링 & 선반': { ko: '밀링 & 선반', vi: 'Phay & Tiện' },
  '도금': { ko: '도금', vi: 'Mạ' },
  '표면 처리': { ko: '표면 처리', vi: 'Xử lý bề mặt' },
  '바렐': { ko: '바렐', vi: 'Barrel' },
  '사상': { ko: '사상', vi: 'Gia công cơ khí' },
  '제품 Bur 제거': { ko: '제품 Bur 제거', vi: 'Loại bỏ Bur sản phẩm' },
  '샌딩': { ko: '샌딩', vi: 'Đánh bóng' },
  '세척': { ko: '세척', vi: 'Rửa sạch' },
  '쇼트': { ko: '쇼트', vi: 'Shot' },
  '주조': { ko: '주조', vi: 'Đúc' },
  '다이케스팅 주조': { ko: '다이케스팅 주조', vi: 'Đúc áp lực' },
  '포장': { ko: '포장', vi: 'Đóng gói' },
  '크로메이트': { ko: '크로메이트', vi: 'Chromate' },
  '리크 검사': { ko: '리크 검사', vi: 'Kiểm tra rò rỉ' },
  '분체 도장': { ko: '분체 도장', vi: 'Sơn bột' },
  '액상 도장': { ko: '액상 도장', vi: 'Sơn lỏng' },
  '외관 검사': { ko: '외관 검사', vi: 'Kiểm tra ngoại quan' },
};

// 후공정 이름 번역 함수
export const translatePostProcessingName = (name: string, language: 'ko' | 'vi'): string => {
  const translation = postProcessingTranslations[name];
  if (translation) {
    return translation[language];
  }
  return name; // 번역이 없으면 원본 반환
};

// 후공정 설명 번역 함수
export const translatePostProcessingDescription = (description: string | undefined, language: 'ko' | 'vi'): string | undefined => {
  if (!description) return undefined;
  const translation = postProcessingTranslations[description];
  if (translation) {
    return translation[language];
  }
  return description; // 번역이 없으면 원본 반환
};

