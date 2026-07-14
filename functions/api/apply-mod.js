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

        // Đọc định dạng ảnh (png, jpeg,...) để tạo tiền tố chuẩn như file Python
        const mimeType = imageFile.type || 'image/png';

        // Chuyển file ảnh sang chuỗi mã hóa Base64 chuẩn hóa trên Cloudflare Workers
        const arrayBuffer = await imageFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
        }
        const base64Raw = globalThis.btoa ? globalThis.btoa(binaryString) : btoa(binaryString);
        
        // Tạo chuỗi Base64 có tiền tố định dạng chuẩn (Giống hệt cách file Python xử lý)
        const base64Image = `data:${mimeType};base64,${base64Raw}`;

        // Thiết lập Header chuẩn đồng bộ cho mọi yêu cầu gửi tới Garena
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

        // ➔ BƯỚC 1: KHỞI TẠO PHIÊN ĐỔI (editInfo)
        const editInfoRes = await fetch('https://kgvn-api.mobagarena.com/api/game/poster/playerimage/editInfo', {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify({
                type: poster_type,
                mode: display_mode,
                areaid: 1
            })
        });
        const editInfoData = await editInfoRes.json();
        if (editInfoData.error_code !== 0 && editInfoData.code !== 0) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'Lỗi khởi tạo phiên (editInfo): ' + (editInfoData.error_msg || editInfoData.msg)
            }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
        }

        // ➔ BƯỚC 2: TẢI ẢNH LÊN CDN GARENA (upload_image) - BÍ MẬT TỪ FILE PYTHON
        const uploadRes = await fetch('https://kgvn-api.mobagarena.com/api/game/poster/playerimage/upload_image', {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify({
                image_data: base64Image,
                type: poster_type,
                areaid: 1
            })
        });
        const uploadData = await uploadRes.json();
        if (uploadData.error_code !== 0 && uploadData.code !== 0) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'Lỗi tải ảnh lên CDN Garena (upload_image): ' + (uploadData.error_msg || uploadData.msg)
            }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
        }

        // Lấy đường dẫn ảnh CDN do Garena trả về sau khi upload thành công
        const cdnImageUrl = uploadData.data?.image_url || uploadData.image_url;

        // ➔ BƯỚC 3: LƯU VÀ ÁP DỤNG POSTER (saveposter)
        const saveRes = await fetch('https://kgvn-api.mobagarena.com/api/game/poster/playerimage/saveposter', {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify({
                image_url: cdnImageUrl, // Sử dụng đường link CDN vừa nhận ở bước 2
                type: poster_type,
                mode: display_mode,
                areaid: 1
            })
        });
        const saveData = await saveRes.json();

        return new Response(JSON.stringify({ success: true, data: saveData }), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Lỗi Edge Worker: ' + error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }
}
