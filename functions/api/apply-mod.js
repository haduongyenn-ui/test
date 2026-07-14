// functions/api/apply-mod.js

export async function onRequestPost(context) {
    try {
        const { request } = context;
        const formData = await request.formData();
        
        const token = formData.get('token');
        const encode_param = formData.get('encode_param');
        const poster_type = formData.get('poster_type'); 
        const display_mode = formData.get('display_mode'); 
        const imageFile = formData.get('poster_image');

        if (!token || !encode_param || !imageFile) {
            return new Response(JSON.stringify({ success: false, message: 'Vui lòng nhập đủ cả 2 mã và chọn ảnh!' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }

        // Chuyển đổi file ảnh sang chuỗi Base64 hoạt động tốt trên Cloudflare Workers
        const arrayBuffer = await imageFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
        }
        const base64Raw = globalThis.btoa ? globalThis.btoa(binaryString) : btoa(binaryString);
        
        // Định dạng MIME chuẩn xác cho ảnh
        const mimeType = imageFile.type || 'image/jpeg';
        const base64Image = `data:${mimeType};base64,${base64Raw}`;

        // Header giả lập khớp 100% với thiết bị của bạn từ file .har thực tế
        const commonHeaders = {
            'Host': 'kgvn-api.mobagarena.com',
            'Msdk-Itopencodeparam': token,
            'Encodeparam': encode_param,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MSDK/5.36.000.9136 mQQAppId/1105779914 mWXAppId/wx7a814e3ceeda8320 mGameId/1137 MSDKDeviceModel/8A1C0521-6C1A-42CD-8317-3A8BE1DC848A',
            'Origin': 'https://kgvn-camp.mobagarena.com',
            'Referer': 'https://kgvn-camp.mobagarena.com/',
            'Aov-Region': '1137',
            'Aov-Language': 'VN',
            'Msdk-Channelid': '10',
            'Camp-Source': 'AOV-CAMP',
            'logicworldid': '1011',
            'Msdk-Gameid': '1137',
            'Msdk-Os': '2',
            'areaid': '1',
            'Accept': '*/*',
            'Accept-Language': 'vi-VN,vi;q=0.9'
        };

        // ➔ BƯỚC 1: KHỞI TẠO PHIÊN (editInfo) - Khớp chuẩn kiểu dữ liệu String "1"
        const editInfoResponse = await fetch('https://kgvn-api.mobagarena.com/api/game/poster/playerimage/editInfo', {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify({
                type: poster_type,
                mode: display_mode,
                areaid: "1" // Đổi từ dạng số sang dạng chuỗi "1" khớp chuẩn với gói tin .har của bạn
            })
        });
        
        const editInfoResult = await editInfoResponse.json();

        // Nếu bước khởi tạo phiên thất bại, xuất cụ thể mã lỗi từ Garena về màn hình
        if (editInfoResult.error_code !== 0 && editInfoResult.code !== 0) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: `Lỗi đăng ký phiên Garena (editInfo): ${editInfoResult.error_code || editInfoResult.code}:${editInfoResult.error_msg || editInfoResult.msg}`
            }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
        }

        // ➔ BƯỚC 2: TIẾN HÀNH GHI ĐÈ ẢNH (saveposter)
        const savePosterResponse = await fetch('https://kgvn-api.mobagarena.com/api/game/poster/playerimage/saveposter', {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify({
                image_data: base64Image,
                type: poster_type,
                mode: display_mode,
                areaid: "1" // Khớp chuẩn dạng chuỗi "1"
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
