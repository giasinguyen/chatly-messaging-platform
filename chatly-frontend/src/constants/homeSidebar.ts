export interface HomePeopleSuggestion {
    id: string;
    displayName: string;
    username: string;
    mutualFriends: number;
    avatarUrl?: string;
}

export const HOME_PEOPLE_SUGGESTIONS: HomePeopleSuggestion[] = [
    {
        id: "mock-people-1",
        displayName: "Minh Anh",
        username: "minhanh",
        mutualFriends: 12,
    },
    {
        id: "mock-people-2",
        displayName: "Bao Nguyen",
        username: "baonguyen",
        mutualFriends: 8,
    },
    {
        id: "mock-people-3",
        displayName: "Linh Tran",
        username: "linhtran",
        mutualFriends: 5,
    },
];
