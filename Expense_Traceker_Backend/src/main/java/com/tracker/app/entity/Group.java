package com.tracker.app.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "split_groups")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Group {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String emoji = "🏖️";

    @Column(unique = true, nullable = false, length = 8)
    private String inviteCode;

    @Column(nullable = false)
    private String createdBy;   // username of creator

    // Members stored as comma-separated usernames for simplicity
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "group_members", joinColumns = @JoinColumn(name = "group_id"))
    @Column(name = "username")
    private List<String> members = new ArrayList<>();

    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<GroupExpense> expenses = new ArrayList<>();
}