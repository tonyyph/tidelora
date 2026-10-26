import type { Phase } from '../fishing/session';

/**
 * First-trip coaching, one line per phase. The tutorial session also widens the
 * take window and landing window, so the first fish is forgiving.
 */
export const COACH: Partial<Record<Phase, string>> = {
  aiming: 'Kéo ngón tay trên mặt nước để ngắm, thả tay để quăng. Thử mép đám sen bên trái.',
  casting: 'Phao đang bay…',
  settling: 'Phao nằm xuống rồi dựng đứng khi chì chìm.',
  waiting: 'Nhìn phao trong khung phóng to góc phải. Phao rung nhẹ do gió thì chưa phải cá ăn.',
  investigating: 'Có gợn nước quanh phao. Cá đang đến gần.',
  nibbling: 'Cá đang rỉa mồi. Chờ, chưa giật vội.',
  hookWindow: 'Phao chìm hẳn! Giật ngay!',
  fighting: 'Giữ Thu dây để kéo. Khi vạch báo "Căng", thả tay một nhịp. Vuốt ngang để lái cá.',
  landing: 'Cá đã mệt và sát chân cầu. Bấm Vớt.',
};

/** After the tutorial: only the lines that still help. Signals (rings, button pulse) carry the rest. */
export const HINT_GENERAL: Partial<Record<Phase, string>> = {
  aiming: 'Kéo trên mặt nước để ngắm · thả tay để quăng',
  waiting: 'Chờ phao chìm hẳn, nút Giật sẽ sáng lên',
};
