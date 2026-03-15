<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>System Status - Chatly</title>
        <style>
            body {
                font-family:
                    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                    "Helvetica Neue", Arial, sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background-color: #f0f2f5;
                color: #333;
            }
            .status-container {
                background-color: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 400px;
                width: 90%;
            }
            .status-icon {
                font-size: 64px;
                color: #22c55e; /* Green 500 */
                margin-bottom: 20px;
            }
            .status-title {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 10px;
                color: #111827;
            }
            .status-message {
                font-size: 16px;
                color: #4b5563;
            }
            .status-pulse {
                display: inline-block;
                width: 12px;
                height: 12px;
                background-color: #22c55e;
                border-radius: 50%;
                margin-right: 8px;
                box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% {
                    transform: scale(0.95);
                    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
                }
                70% {
                    transform: scale(1);
                    box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
                }
                100% {
                    transform: scale(0.95);
                    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
                }
            }
        </style>
    </head>
    <body>
        <div class="status-container">
            <h1 class="status-title">
                <span class="status-pulse"></span>
                System Online
            </h1>
            <p class="status-message">Hệ thống đang hoạt động ổn định.</p>
            <p
                class="status-message"
                style="margin-top: 20px; font-size: 12px; color: #9ca3af"
            >
                Chatly Messaging Platform API is up and running.
            </p>
        </div>
    </body>
</html>

