module.exports = async function (context, req) {
    context.log('ExportExcel function processed a request');

    try {
        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                message: "Excel export function is working",
                timestamp: new Date().toISOString()
            }
        };
        
        context.log('Excel export test completed successfully');
    } catch (error) {
        context.log.error('Excel export error:', error);
        
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                error: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
};