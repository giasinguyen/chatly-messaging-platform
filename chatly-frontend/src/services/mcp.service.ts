import axiosClient from "@/lib/axiosClient";
import type { McpServer, McpServerCreate, McpTool } from "@/types/agent";

const BASE = "/api/ai/mcp/servers";

export const mcpService = {
    create: async (payload: McpServerCreate): Promise<McpServer> => {
        const res = await axiosClient.post(BASE, payload);
        return res.data;
    },

    list: async (): Promise<McpServer[]> => {
        const res = await axiosClient.get(BASE);
        return res.data;
    },

    get: async (serverId: string): Promise<McpServer> => {
        const res = await axiosClient.get(`${BASE}/${serverId}`);
        return res.data;
    },

    delete: async (serverId: string): Promise<void> => {
        await axiosClient.delete(`${BASE}/${serverId}`);
    },

    toggle: async (serverId: string, isActive: boolean): Promise<McpServer> => {
        const res = await axiosClient.patch(`${BASE}/${serverId}/toggle`, { is_active: isActive });
        return res.data;
    },

    listTools: async (serverId: string): Promise<McpTool[]> => {
        const res = await axiosClient.get(`${BASE}/${serverId}/tools`);
        return res.data;
    },
};
