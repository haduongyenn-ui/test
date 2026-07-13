// functions/api/apply-mod.js

export async function onRequestPost(context) {
    try {
        const { request } = context;
        const formData = await request.formData();
        
        const token = formData.get('token');
        const encode_param = formData.get('encode_param');
        const poster_type = formData.get('poster_type'); // 'load_tran' hoặc 'flowborn'
        const display_mode = formData.get('display_mode'); // 'public' hoặc 'private'
        const imageFile = formData.get('poster_image');

        if (!token || !encode_param || !imageFile) {
            return new Response(JSON.stringify({ success: false, message: 'Vui lòng nhập đủ cả 2 mã và chọn ảnh!' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }

        // Đọc dữ liệu ảnh và chuyển sang chuỗi Base64
        const arrayBuffer = await imageFile.arrayBuffer();
        const base64Image = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // GỬI THẲNG CHUẨN CẤU TRÚC JSON SANG GARENA
        const garenaResponse = await fetch('https://kgvn-api.mobagarena.com/api/game/poster/playerimage/saveposter', {
            method: 'POST',
            headers: {
                'Host': 'kgvn-api.mobagarena.com',
                'Msdk-Itopencodeparam': token,
                'Encodeparam': encode_param,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MSDK/5.36.000.9136',
                'Origin': 'https://kgvn-camp.mobagarena.com',
                'Referer': 'https://kgvn-camp.mobagarena.com/',
                'Aov-Region': '1137',
                'Aov-Language': 'VN',
                'Accept': '*/*',
                'Accept-Language': 'vi-VN,vi;q=0.9'
            },
            body: JSON.stringify({
                image_data: base64Image,
                type: poster_type,
                mode: display_mode, // Đảm bảo truyền 'public' hoặc 'private' chuẩn tiếng Anh
                areaid: 1           // Khóa areaid bổ sung chính xác từ log game
            })
        });

        const resData = await garenaResponse.json();

        return new Response(JSON.stringify({ success: true, data: resData }), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Lỗi Edge Worker: ' + error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }
}
