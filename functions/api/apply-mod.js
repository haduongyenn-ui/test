// functions/api/apply-mod.js

export async function onRequestPost(context) {
    try {
        const { request } = context;
        const formData = await request.formData();
        
        const token = formData.get('token');
        const encode_param = formData.get('encode_param');
        const poster_type = formData.get('poster_type'); // 'load_tran'
        const display_mode = formData.get('display_mode'); // 'public' hoặc 'private'
        const imageFile = formData.get('poster_image');

        if (!token || !encode_param || !imageFile) {
            return new Response(JSON.stringify({ success: false, message: 'Vui lòng nhập đủ cả 2 mã và chọn ảnh!' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }

        // 1. Chuyển đổi dữ liệu file ảnh sang chuỗi mã hóa Base64
        const arrayBuffer = await imageFile.arrayBuffer();
        const base64Image = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // Cấu hình Header chuẩn chung cho cả 2 request sang Garena
        const commonHeaders = {
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
        };

        // ➔ BƯỚC 1: KHỞI TẠO PHIÊN ĐĂNG KÝ (editInfo) - BẮT BUỘC THEO LOG GAME
        const editInfoResponse = await fetch('https://kgvn-api.mobagarena.com/api/game/poster/playerimage/editInfo', {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify({
                type: poster_type,
                mode: display_mode,
                areaid: 1
            })
        });
        
        const editInfoResult = await editInfoResponse.json();

        // Nếu bước khởi tạo phiên thất bại (do Token/Mã động hết hạn hoặc sai), dừng lại luôn
        if (editInfoResult.error_code !== 0 && editInfoResult.code !== 0) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'Thất bại ở bước khởi tạo phiên (editInfo): ' + (editInfoResult.error_msg || editInfoResult.msg)
            }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
        }

        // ➔ BƯỚC 2: TIẾN HÀNH GHI ĐÈ DỮ LIỆU ẢNH (saveposter) TẬP TIN CHÍNH
        const savePosterResponse = await fetch('https://kgvn-api.mobagarena.com/api/game/poster/playerimage/saveposter', {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify({
                image_data: base64Image,
                type: poster_type,
                mode: display_mode,
                areaid: 1
            })
        });

        const resData = await savePosterResponse.json();

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
