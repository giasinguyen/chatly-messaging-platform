-- Seed data for users table
-- Password for all users: 'password123'

INSERT INTO users (id, email, password, display_name, avatar_url, phone, bio, status, last_seen, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'trungnguyenwork123@email.com', '$2a$10$I4b1825dVqvKGT/WgIO9ZObSuogcvHcApLq1ntWrf/F3uxGLYsF6G', 'Nguyễn Trung Nguyên', 'https://i.pravatar.cc/150?img=1', '+84901234567', 'Yêu thích công nghệ và lập trình.', 'ONLINE', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'nguyenvana@email.com', '$2a$10$I4b1825dVqvKGT/WgIO9ZObSuogcvHcApLq1ntWrf/F3uxGLYsF6G', 'Nguyễn Văn A', 'https://i.pravatar.cc/150?img=1', '+84901111111', 'Yêu thích công nghệ và lập trình. Thích du lịch và khám phá những điều mới mẻ.', 'ONLINE', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'tranb@email.com', '$2a$10$I4b1825dVqvKGT/WgIO9ZObSuogcvHcApLq1ntWrf/F3uxGLYsF6G', 'Trần Thị B', 'https://i.pravatar.cc/150?img=2', '+84902345678', 'Đam mê nhiếp ảnh và nghệ thuật. Thích giao lưu và kết bạn mới.', 'OFFLINE', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'vanc@email.com', '$2a$10$I4b1825dVqvKGT/WgIO9ZObSuogcvHcApLq1ntWrf/F3uxGLYsF6G', 'Lê Văn C', 'https://i.pravatar.cc/150?img=3', '+84903456789', 'Developer fullstack, thích xây dựng các ứng dụng web hiện đại.', 'ONLINE', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'phamd@email.com', '$2a$10$I4b1825dVqvKGT/WgIO9ZObSuogcvHcApLq1ntWrf/F3uxGLYsF6G', 'Phạm Thị D', 'https://i.pravatar.cc/150?img=4', '+84904567890', 'Yêu âm nhạc và ca hát. Thích chia sẻ những khoảnh khắc đẹp trong cuộc sống.', 'AWAY', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'hoange@email.com', '$2a$10$I4b1825dVqvKGT/WgIO9ZObSuogcvHcApLq1ntWrf/F3uxGLYsF6G', 'Hoàng Văn E', 'https://i.pravatar.cc/150?img=5', '+84905678901', 'Kỹ sư phần mềm, đam mê AI và Machine Learning. Thích đọc sách và học hỏi.', 'ONLINE', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'vof@email.com', '$2a$10$I4b1825dVqvKGT/WgIO9ZObSuogcvHcApLq1ntWrf/F3uxGLYsF6G', 'Võ Thị F', 'https://i.pravatar.cc/150?img=6', '+84906789012', 'Designer sáng tạo, yêu thích màu sắc và hình khối. Đam mê du lịch khắp thế giới.', 'OFFLINE', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'dangg@email.com', '$2a$10$I4b1825dVqvKGT/WgIO9ZObSuogcvHcApLq1ntWrf/F3uxGLYsF6G', 'Đặng Văn G', 'https://i.pravatar.cc/150?img=7', '+84907890123', 'Startup founder, thích khởi nghiệp và tạo ra giá trị mới. Yêu thể thao và sống khỏe.', 'ONLINE', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'buih@email.com', '$2a$10$I4b1825dVqvKGT/WgIO9ZObSuogcvHcApLq1ntWrf/F3uxGLYsF6G', 'Bùi Thị H', 'https://i.pravatar.cc/150?img=8', '+84908901234', 'Content creator, thích viết blog và chia sẻ kinh nghiệm. Yêu động vật và thiên nhiên.', 'AWAY', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'doi@email.com', '$2a$10$I4b1825dVqvKGT/WgIO9ZObSuogcvHcApLq1ntWrf/F3uxGLYsF6G', 'Đỗ Văn I', 'https://i.pravatar.cc/150?img=9', '+84909012345', 'Product Manager, đam mê xây dựng sản phẩm có ích cho người dùng. Thích cafe và sách.', 'ONLINE', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'ngok@email.com', '$2a$10$I4b1825dVqvKGT/WgIO9ZObSuogcvHcApLq1ntWrf/F3uxGLYsF6G', 'Ngô Thị K', 'https://i.pravatar.cc/150?img=10', '+84900111222', 'Marketing specialist, yêu thích sáng tạo nội dung. Thích yoga và meditation.', 'OFFLINE', NOW(), NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
