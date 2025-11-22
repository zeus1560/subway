// CSV 파일 디버깅 스크립트
import { readFileSync } from 'fs';
import { join } from 'path';
import iconv from 'iconv-lite';

const csvPath = join(process.cwd(), 'subway_passengers.csv');

console.log('=== CSV 파일 인코딩 디버깅 ===\n');

// 1. UTF-8로 읽기
console.log('1. UTF-8로 읽기:');
const utf8Text = readFileSync(csvPath, 'utf-8');
const utf8KoreanCount = (utf8Text.match(/[가-힣]/g) || []).length;
console.log(`   한글 문자 개수: ${utf8KoreanCount}`);
console.log(`   샘플 (첫 200자): ${utf8Text.substring(0, 200)}`);
console.log(`   두 번째 줄: ${utf8Text.split('\n')[1]?.substring(0, 100)}`);

// 2. CP949로 읽기
console.log('\n2. CP949로 읽기:');
const buffer = readFileSync(csvPath);
const cp949Text = iconv.decode(buffer, 'cp949');
const cp949KoreanCount = (cp949Text.match(/[가-힣]/g) || []).length;
console.log(`   한글 문자 개수: ${cp949KoreanCount}`);
console.log(`   샘플 (첫 200자): ${cp949Text.substring(0, 200)}`);
console.log(`   두 번째 줄: ${cp949Text.split('\n')[1]?.substring(0, 100)}`);

// 3. EUC-KR로 읽기
console.log('\n3. EUC-KR로 읽기:');
const eucKrText = iconv.decode(buffer, 'euc-kr');
const eucKrKoreanCount = (eucKrText.match(/[가-힣]/g) || []).length;
console.log(`   한글 문자 개수: ${eucKrKoreanCount}`);
console.log(`   샘플 (첫 200자): ${eucKrText.substring(0, 200)}`);
console.log(`   두 번째 줄: ${eucKrText.split('\n')[1]?.substring(0, 100)}`);

// 4. 두 번째 줄 파싱 (역명 추출)
console.log('\n4. 두 번째 줄 파싱 (역명 추출):');
const lines = cp949Text.split('\n');
if (lines.length > 1) {
  const secondLine = lines[1];
  const fields = secondLine.split(',');
  console.log(`   전체 필드 개수: ${fields.length}`);
  console.log(`   필드[0] (날짜): ${fields[0]?.replace(/"/g, '')}`);
  console.log(`   필드[1] (호선): ${fields[1]?.replace(/"/g, '')}`);
  console.log(`   필드[2] (역명): ${fields[2]?.replace(/"/g, '')}`);
  console.log(`   필드[2] 바이트: ${Buffer.from(fields[2]?.replace(/"/g, '') || '').toString('hex')}`);
}

console.log('\n=== 완료 ===');

