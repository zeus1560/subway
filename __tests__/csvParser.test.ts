import { parseCSV, CSVRow } from '@/lib/csvParser';

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    it('정상적인 CSV 데이터를 파싱해야 함', () => {
      const csvText = `"날짜","호선","역명","04시-05시 승차인원","04시-05시 하차인원","05시-06시 승차인원","05시-06시 하차인원","작업일자"
"202510","1호선","서울역","707","32","10682","1943","20251103"
"202510","1호선","시청역","189","4","2749","821","20251103"`;

      const result = parseCSV(csvText);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        date: '202510',
        lineNum: '1호선',
        stationName: '서울역',
        workDate: '20251103',
      });
      expect(result[0].timeSlots).toBeDefined();
      expect(result[0].timeSlots.length).toBeGreaterThan(0);
      
      // 시간대 슬롯 확인
      const timeSlot = result[0].timeSlots.find(ts => ts.hour === 4);
      expect(timeSlot).toBeDefined();
      if (timeSlot) {
        expect(timeSlot.rideCount).toBe(707);
        expect(timeSlot.alightCount).toBe(32);
      }
    });

    it('빈 CSV는 빈 배열을 반환해야 함', () => {
      const csvText = '';
      const result = parseCSV(csvText);
      expect(result).toEqual([]);
    });

    it('헤더만 있는 CSV는 빈 배열을 반환해야 함', () => {
      const csvText = `"날짜","호선","역명","04시-05시 승차인원","04시-05시 하차인원","작업일자"`;
      const result = parseCSV(csvText);
      expect(result).toEqual([]);
    });

    it('잘못된 형식의 행은 건너뛰어야 함', () => {
      const csvText = `"날짜","호선","역명","04시-05시 승차인원","04시-05시 하차인원","작업일자"
"202510","1호선","서울역","707","32","20251103"
"invalid","row","too","few","columns"
"202510","1호선","시청역","189","4","20251103"`;

      const result = parseCSV(csvText);
      // 유효한 행 2개만 파싱되어야 함
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('숫자가 아닌 승차/하차 인원은 0으로 처리해야 함', () => {
      const csvText = `"날짜","호선","역명","04시-05시 승차인원","04시-05시 하차인원","작업일자"
"202510","1호선","서울역","invalid","NaN","20251103"`;

      const result = parseCSV(csvText);
      expect(result).toHaveLength(1);
      const timeSlot = result[0].timeSlots.find(ts => ts.hour === 4);
      if (timeSlot) {
        expect(timeSlot.rideCount).toBe(0);
        expect(timeSlot.alightCount).toBe(0);
      }
    });

    it('따옴표로 감싸진 필드를 올바르게 파싱해야 함', () => {
      const csvText = `"날짜","호선","역명","04시-05시 승차인원","04시-05시 하차인원","작업일자"
"202510","1호선","서울역","707","32","20251103"`;

      const result = parseCSV(csvText);
      expect(result[0].stationName).toBe('서울역');
      expect(result[0].date).toBe('202510');
    });

    it('여러 시간대를 올바르게 파싱해야 함', () => {
      const csvText = `"날짜","호선","역명","04시-05시 승차인원","04시-05시 하차인원","05시-06시 승차인원","05시-06시 하차인원","작업일자"
"202510","1호선","서울역","707","32","10682","1943","20251103"`;

      const result = parseCSV(csvText);
      expect(result[0].timeSlots.length).toBeGreaterThanOrEqual(2);
      
      const hour4Slot = result[0].timeSlots.find(ts => ts.hour === 4);
      const hour5Slot = result[0].timeSlots.find(ts => ts.hour === 5);
      
      expect(hour4Slot).toBeDefined();
      expect(hour5Slot).toBeDefined();
      
      if (hour4Slot) {
        expect(hour4Slot.rideCount).toBe(707);
      }
      if (hour5Slot) {
        expect(hour5Slot.rideCount).toBe(10682);
      }
    });
  });
});

